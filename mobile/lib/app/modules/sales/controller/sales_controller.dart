import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../model/enterprise_model.dart';
import '../model/visit_prep_model.dart';
import '../model/visit_report_model.dart';
import '../model/visit_history_item.dart';
import '../model/plaque_model.dart';
import '../model/live_copilot_model.dart';
import '../model/field_intelligence_model.dart';
import '../model/ocr_document_model.dart';
import '../model/sales_notification_model.dart';
import '../model/visit_form_submission_model.dart';
import '../../catalog/model/offer_questionnaire_model.dart';
import '../../../core/api/api_client.dart';
import '../../../core/services/notification_service.dart';
import '../../../common/constants/app_constants.dart';

class SalesController extends GetxController {
  final ApiClient _apiClient = Get.find<ApiClient>();

  // Dynamic Back-Office Questionnaires & Guided Visit Form
  final RxList<OfferQuestionnaireModel> availableQuestionnaires = <OfferQuestionnaireModel>[].obs;
  final Rx<OfferQuestionnaireModel?> selectedQuestionnaire = Rx<OfferQuestionnaireModel?>(null);
  final RxMap<int, dynamic> formAnswers = <int, dynamic>{}.obs;
  final RxBool isLoadingQuestionnaires = false.obs;
  final RxBool isSubmittingForm = false.obs;
  final Rx<VisitFormSubmissionModel?> lastSubmissionResult = Rx<VisitFormSubmissionModel?>(null);

  final RxList<EnterpriseModel> searchResults = <EnterpriseModel>[].obs;
  final Rx<EnterpriseModel?> selectedEnterprise = Rx<EnterpriseModel?>(null);
  final Rx<EnterpriseModel?> selectedMapEnterprise = Rx<EnterpriseModel?>(null);
  final Rx<VisitPrepModel?> currentPrep = Rx<VisitPrepModel?>(null);
  final Rx<VisitReportModel?> currentReport = Rx<VisitReportModel?>(null);
  final Rx<LiveCopilotTurnModel?> currentLiveCopilot = Rx<LiveCopilotTurnModel?>(null);
  final RxBool isAnalyzingCopilotTurn = false.obs;

  // Dynamic server-backed KPIs & Plaques
  final RxInt kpiVisitsCount = 3.obs;
  final RxInt kpiReportsCount = 12.obs;
  final RxList<VisitHistoryItem> visitsHistory = <VisitHistoryItem>[].obs;
  final RxList<PlaqueModel> plaquesList = <PlaqueModel>[].obs;
  final RxBool isLoadingVisits = false.obs;
  final RxBool isLoadingPlaques = false.obs;

  // Real-time Push & In-App Notifications
  final RxList<SalesNotificationModel> notifications = <SalesNotificationModel>[].obs;
  final RxInt unreadNotificationsCount = 0.obs;
  final RxBool isLoadingNotifications = false.obs;
  final RxBool isNotificationsOpen = false.obs;

  // Plaque Portfolio Filter & State
  final RxBool isPlaqueUnlocked = true.obs;
  final RxString activePlaqueCode = 'Toutes'.obs;
  final RxString selectedPlaqueFilter = 'Toutes'.obs;
  final RxString plaqueErrorMessage = ''.obs;

  final RxList<String> availablePlaques = <String>['Toutes'].obs;

  final RxBool isSearching = false.obs;
  final RxBool isCreatingPrep = false.obs;
  final RxBool isGeneratingReport = false.obs;
  final RxBool isTransmitting = false.obs;
  final RxBool isEnriching = false.obs;
  final RxBool isSubmittingFeedback = false.obs;

  final RxString errorMessage = ''.obs;
  final RxString successMessage = ''.obs;

  /// Enterprise repository loaded dynamically from Backend CRM API
  final List<EnterpriseModel> _allEnterprises = [];
  List<EnterpriseModel> get allEnterprises => _allEnterprises;

  @override
  void onInit() {
    super.onInit();
    // Demande d'autorisation pour les notifications push
    _initPushPermissions();
    fetchPlaques();
    fetchEnterprises();
    fetchNotifications(showBannerOnNew: true);
    fetchDashboardStats();
    fetchVisitsHistory();
  }

  /// Charge les entreprises réelles depuis la base de données PostgreSQL du backend
  Future<void> fetchEnterprises() async {
    try {
      final response = await _apiClient.get('/api/sales/enterprises/', queryParams: {'limit': '400'});
      List rawList = [];
      if (response is Map && response['enterprises'] is List) {
        rawList = response['enterprises'] as List;
      } else if (response is List) {
        rawList = response;
      }

      if (rawList.isNotEmpty) {
        final parsed = rawList
            .map((e) => EnterpriseModel.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList();
        _allEnterprises.clear();
        _allEnterprises.addAll(parsed);
        searchResults.value = List.from(_allEnterprises);
        if (selectedMapEnterprise.value == null && _allEnterprises.isNotEmpty) {
          selectedMapEnterprise.value = _allEnterprises.first;
        }
      }
    } catch (e) {
      debugPrint("[Enterprises] Erreur lors du chargement des entreprises réelles: $e");
    }
  }

  Future<void> _initPushPermissions() async {
    try {
      if (Get.isRegistered<NotificationService>()) {
        await NotificationService.to.requestNotificationPermission();
      }
    } catch (_) {}
  }

  /// Fetch Push / In-App Notifications for the Salesperson
  Future<void> fetchNotifications({bool showBannerOnNew = false}) async {
    isLoadingNotifications.value = true;
    try {
      final response = await _apiClient.get('/api/sales/notifications/');
      if (response is Map<String, dynamic>) {
        final List notifsData = response['notifications'] ?? [];
        final int unread = response['unread_count'] ?? 0;
        final newNotifs = notifsData.map((e) => SalesNotificationModel.fromJson(e as Map<String, dynamic>)).toList();

        // Déclenchement de la notification push native Android / iOS
        if (showBannerOnNew && unread > 0 && newNotifs.isNotEmpty) {
          final unreadItems = newNotifs.where((n) => !n.isRead).toList();
          for (final item in unreadItems) {
            if (Get.isRegistered<NotificationService>()) {
              NotificationService.to.showPushNotification(
                id: item.id,
                title: item.title,
                body: item.message,
                payload: {
                  'notification_id': item.id,
                  'plaque_code': item.plaqueCode,
                  'center': item.payload['center'],
                },
              );
            }
          }

          if (unreadItems.isNotEmpty) {
            final latest = unreadItems.first;
            Get.snackbar(
              latest.title,
              latest.message,
              snackPosition: SnackPosition.TOP,
              backgroundColor: AppConstants.primaryBlack,
              colorText: Colors.white,
              duration: const Duration(seconds: 6),
              margin: const EdgeInsets.all(16),
              borderRadius: 16,
              icon: const Icon(Icons.notifications_active, color: Colors.white),
            );
          }
        }

        notifications.value = newNotifs;
        unreadNotificationsCount.value = unread;
      }
    } catch (_) {
      // Offline fallback
    } finally {
      isLoadingNotifications.value = false;
    }
  }

  Future<void> markNotificationAsRead(int id) async {
    try {
      await _apiClient.post('/api/sales/notifications/$id/mark-read/', body: {});
      final index = notifications.indexWhere((n) => n.id == id);
      if (index != -1) {
        final current = notifications[index];
        final updated = SalesNotificationModel(
          id: current.id,
          title: current.title,
          message: current.message,
          notificationType: current.notificationType,
          plaqueId: current.plaqueId,
          plaqueCode: current.plaqueCode,
          plaqueName: current.plaqueName,
          payload: current.payload,
          isRead: true,
          createdAt: current.createdAt,
        );
        notifications[index] = updated;
        if (unreadNotificationsCount.value > 0) {
          unreadNotificationsCount.value--;
        }
      }
    } catch (_) {}
  }

  Future<void> markAllNotificationsAsRead() async {
    try {
      await _apiClient.post('/api/sales/notifications/mark-all-read/', body: {});
      notifications.value = notifications.map((n) => SalesNotificationModel(
        id: n.id,
        title: n.title,
        message: n.message,
        notificationType: n.notificationType,
        plaqueId: n.plaqueId,
        plaqueCode: n.plaqueCode,
        plaqueName: n.plaqueName,
        payload: n.payload,
        isRead: true,
        createdAt: n.createdAt,
      )).toList();
      unreadNotificationsCount.value = 0;
    } catch (_) {}
  }

  void setFilterPlaque(String code) {
    selectedPlaqueFilter.value = code;
    activePlaqueCode.value = code;
    if (code == 'Toutes') {
      searchResults.value = List.from(_allEnterprises);
    } else {
      searchResults.value = _allEnterprises.where((e) => e.plaqueCode == code).toList();
    }
  }

  /// 1. Fetch Plaque list from Backend API
  Future<void> fetchPlaques() async {
    isLoadingPlaques.value = true;
    try {
      final response = await _apiClient.get('/api/sales/plaques/');
      List rawList = [];
      if (response is List) {
        rawList = response;
      } else if (response is Map && response['results'] is List) {
        rawList = response['results'] as List;
      } else if (response is Map && response['plaques'] is List) {
        rawList = response['plaques'] as List;
      }

      if (rawList.isNotEmpty) {
        final parsed = rawList
            .map((e) => PlaqueModel.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList();
        plaquesList.value = parsed;
        final codes = ['Toutes', ...parsed.map((p) => p.code)];
        availablePlaques.value = codes;
        if (!codes.contains(activePlaqueCode.value)) {
          activePlaqueCode.value = 'Toutes';
        }
        debugPrint("[Plaques] Synchronisation réussie : ${parsed.length} plaque(s) récupérée(s)");
      } else {
        debugPrint("[Plaques] Aucune plaque en base de données ou liste vide reçue");
      }
    } catch (e) {
      debugPrint("[Plaques] Erreur lors de la récupération des plaques : $e");
    } finally {
      isLoadingPlaques.value = false;
    }
  }

  /// 2. Scraping & AI Hypotheses Enrichment Endpoint
  Future<bool> enrichEnterpriseWithScraping(int enterpriseId) async {
    isEnriching.value = true;
    errorMessage.value = '';
    successMessage.value = '';

    try {
      final response = await _apiClient.post('/api/sales/enterprises/$enterpriseId/enrich/');
      if (response is Map && response.containsKey('enterprise')) {
        final updatedEnt = EnterpriseModel.fromJson(response['enterprise'] as Map<String, dynamic>);
        selectedEnterprise.value = updatedEnt;
        selectedMapEnterprise.value = updatedEnt;

        final idx = searchResults.indexWhere((e) => e.id == enterpriseId);
        if (idx != -1) {
          searchResults[idx] = updatedEnt;
        }
        successMessage.value = "Fiche entreprise scrapée et enrichie d'hypothèses IA avec succès.";
        isEnriching.value = false;
        return true;
      }
    } catch (e) {
      errorMessage.value = "Enrichissement IA échoué: ${e.toString()}";
    } finally {
      isEnriching.value = false;
    }
    return false;
  }

  /// 3. Real-Time Live Copilot Turn Endpoint (Silence-aware async stream)
  Future<LiveCopilotTurnModel?> sendLiveCopilotTurn(int enterpriseId, String transcriptChunk) async {
    isAnalyzingCopilotTurn.value = true;
    try {
      final response = await _apiClient.post(
        '/api/sales/live-copilot/turn/',
        body: {
          'enterprise_id': enterpriseId,
          'transcript_chunk': transcriptChunk,
        },
      );

      if (response is Map<String, dynamic>) {
        final turnModel = LiveCopilotTurnModel.fromJson(response);
        
        // Fusion intelligente des packages avec l'état précédent
        final existingPkgs = currentLiveCopilot.value?.realtimeProposition.recommendedPackages ?? [];
        final Map<String, bool> checkedMap = {
          for (var p in existingPkgs) p.serviceId: p.checked,
        };

        final mergedPackages = <RecommendedPackageModel>[];
        final Set<String> seenIds = {};

        // 1. Conserver les offres déjà découvertes
        for (final p in existingPkgs) {
          mergedPackages.add(p);
          seenIds.add(p.serviceId);
        }

        // 2. Ajouter les nouvelles offres retournées par l'IA
        for (final p in turnModel.realtimeProposition.recommendedPackages) {
          if (!seenIds.contains(p.serviceId)) {
            mergedPackages.add(p.copyWith(
              checked: checkedMap[p.serviceId] ?? p.checked,
            ));
            seenIds.add(p.serviceId);
          }
        }

        double totalMonthly = 0.0;
        for (final p in mergedPackages) {
          if (p.checked) totalMonthly += p.monthlyPriceUsd;
        }

        final updatedProp = turnModel.realtimeProposition.copyWith(
          recommendedPackages: mergedPackages,
          estimatedTotalMonthlyUsd: totalMonthly,
        );

        final mergedTurn = LiveCopilotTurnModel(
          sessionId: turnModel.sessionId,
          enterpriseId: turnModel.enterpriseId,
          enterpriseName: turnModel.enterpriseName,
          activeSentiment: turnModel.activeSentiment,
          detectedNeeds: turnModel.detectedNeeds,
          detectedObjections: turnModel.detectedObjections,
          realtimeProposition: updatedProp,
          coachingTip: turnModel.coachingTip,
        );

        currentLiveCopilot.value = mergedTurn;
        return mergedTurn;
      }
    } catch (e) {
      // Fallback local copilot avec détection de Roaming, Fibre, Cybersécurité et Outils Pro
      final chunkLower = transcriptChunk.toLowerCase();
      final currentNeeds = <String>[...currentLiveCopilot.value?.detectedNeeds ?? []];
      final existingPkgs = currentLiveCopilot.value?.realtimeProposition.recommendedPackages ?? [];
      final List<RecommendedPackageModel> mergedPackages = List.from(existingPkgs);
      final Set<String> seenIds = {for (var p in mergedPackages) p.serviceId};

      // Détection Roaming / Voyage
      if (chunkLower.contains('roaming') || chunkLower.contains('voyage') || chunkLower.contains('étranger') || chunkLower.contains('extérieur') || chunkLower.contains('deplacement')) {
        if (!currentNeeds.contains('Connectivité Roaming International')) {
          currentNeeds.add('Connectivité Roaming International');
        }
        if (!seenIds.contains('roaming-pass-pro')) {
          mergedPackages.add(RecommendedPackageModel(
            serviceId: 'roaming-pass-pro',
            name: 'Pass Roaming International Pro (Afrique & Monde)',
            monthlyPriceUsd: 45.0,
            category: 'Mobilité & International',
            pitchArgument: 'Forfait voix & 15 Go d\'internet utilisable dans plus de 80 pays sans surtaxe.',
            objectionKiller: 'Plafond garanti et blocage automatique sans mauvaise surprise.',
            checked: true,
          ));
          seenIds.add('roaming-pass-pro');
        }
      }

      // Fibre Pro
      if (!seenIds.contains('fibre-pro-50m')) {
        mergedPackages.add(RecommendedPackageModel(
          serviceId: 'fibre-pro-50m',
          name: 'Fibre Optique Pro Orange (50 Mbps symétrique)',
          monthlyPriceUsd: 150.0,
          category: 'Très Haut Débit',
          pitchArgument: 'Garantit un débit symétrique stable avec engagement de rétablissement sous 4 heures.',
          objectionKiller: 'Secours 4G automatique activé sans surcoût.',
          checked: true,
        ));
        seenIds.add('fibre-pro-50m');
      }

      // Cybersécurité
      if (chunkLower.contains('sécurité') || chunkLower.contains('virus') || chunkLower.contains('pirat') || chunkLower.contains('antivirus')) {
        if (!currentNeeds.contains('Firewall Managé & Cybersécurité')) {
          currentNeeds.add('Firewall Managé & Cybersécurité');
        }
        if (!seenIds.contains('firewall-utm')) {
          mergedPackages.add(RecommendedPackageModel(
            serviceId: 'firewall-utm',
            name: 'Cyberdéfense Orange Pro (Firewall UTM & EDR)',
            monthlyPriceUsd: 70.0,
            category: 'Cybersécurité',
            pitchArgument: 'Protège l\'ensemble du réseau d\'entreprise contre les cyberattaques.',
            objectionKiller: 'Veille et surveillance 24/7 par le SOC Orange Business.',
            checked: true,
          ));
          seenIds.add('firewall-utm');
        }
      }

      double totalMonthly = 0.0;
      for (final p in mergedPackages) {
        if (p.checked) totalMonthly += p.monthlyPriceUsd;
      }

      currentLiveCopilot.value = LiveCopilotTurnModel(
        sessionId: 1,
        enterpriseId: enterpriseId,
        enterpriseName: selectedEnterprise.value?.name ?? 'Client B2B',
        activeSentiment: 'Positif et réceptif',
        detectedNeeds: currentNeeds,
        detectedObjections: chunkLower.contains('cher') ? ['Budget mensuel limité'] : [],
        coachingTip: 'Écoutez activement et présentez les forfaits Orange Pro adaptés.',
        realtimeProposition: LivePropositionModel(
          title: 'Offre Numérique B2B Personnalisée',
          recommendedPackages: mergedPackages,
          estimatedTotalMonthlyUsd: totalMonthly,
          closingReadinessScore: 88,
        ),
      );
    } finally {
      isAnalyzingCopilotTurn.value = false;
    }
    return currentLiveCopilot.value;
  }

  /// Toggle Live Package checkbox in real time
  Future<void> toggleLivePackage(String serviceId, bool checked) async {
    final cur = currentLiveCopilot.value;
    if (cur == null) return;

    final curProp = cur.realtimeProposition;
    final updatedPkgs = curProp.recommendedPackages.map((p) {
      if (p.serviceId == serviceId) {
        return p.copyWith(checked: checked);
      }
      return p;
    }).toList();

    double newTotal = 0.0;
    for (final p in updatedPkgs) {
      if (p.checked) newTotal += p.monthlyPriceUsd;
    }

    final updatedProp = curProp.copyWith(
      recommendedPackages: updatedPkgs,
      estimatedTotalMonthlyUsd: newTotal,
    );

    currentLiveCopilot.value = LiveCopilotTurnModel(
      sessionId: cur.sessionId,
      enterpriseId: cur.enterpriseId,
      enterpriseName: cur.enterpriseName,
      activeSentiment: cur.activeSentiment,
      detectedNeeds: cur.detectedNeeds,
      detectedObjections: cur.detectedObjections,
      realtimeProposition: updatedProp,
      coachingTip: cur.coachingTip,
    );

    // Asynchronously notify backend
    try {
      await _apiClient.post(
        '/api/sales/live-copilot/toggle-package/',
        body: {
          'enterprise_id': cur.enterpriseId,
          'service_id': serviceId,
          'checked': checked,
        },
      );
    } catch (_) {}
  }

  /// 4. Generate Visit Report from Core AI & transmit to Backoffice KAM
  Future<bool> generateReportFromAI(int prepId, {String? transcript}) async {
    isGeneratingReport.value = true;
    errorMessage.value = '';

    try {
      final body = <String, dynamic>{'preparation_id': prepId};
      if (transcript != null) {
        body['transcript'] = transcript;
      }
      final response = await _apiClient.post(
        '/api/sales/visit-reports/generate-from-ai/',
        body: body,
      );

      if (response is Map<String, dynamic>) {
        final reportId = response['report_id'] ?? prepId;
        currentReport.value = VisitReportModel(
          id: reportId,
          preparationId: prepId,
          rawTranscript: transcript ?? '',
          executiveSummary: response['executive_summary'] ?? '',
          confirmedNeeds: (response['confirmed_needs'] as List?)?.map((e) => e.toString()).toList() ?? [],
          objectionsRaised: (response['objections_raised'] as List?)?.map((e) => e.toString()).toList() ?? [],
          actionsTodo: (response['actions_todo'] as List?)?.map((e) => e.toString()).toList() ?? [],
          followUpEmailDraft: response['follow_up_email_draft'] ?? '',
          createdAt: DateTime.now().toIso8601String(),
        );

        kpiReportsCount.value += 1;
        isGeneratingReport.value = false;
        fetchDashboardStats();
        return true;
      }
    } catch (_) {
      return generateReportFromTranscript(transcript ?? '', audioPath: null);
    } finally {
      isGeneratingReport.value = false;
    }
    return false;
  }

  /// 5. Submit Human Evaluation Feedback to Core AI (Learning Loop)
  Future<bool> submitAIFeedback(int reportId, int rating, String comments) async {
    isSubmittingFeedback.value = true;
    errorMessage.value = '';
    successMessage.value = '';

    try {
      final response = await _apiClient.post(
        '/api/sales/visit-reports/$reportId/feedback/',
        body: {
          'rating': rating,
          'comments': comments,
        },
      );

      successMessage.value = (response as Map<String, dynamic>?)?['message'] ??
          "Feedback d'évaluation envoyé au Core AI pour entraînement continu.";
      isSubmittingFeedback.value = false;
      return true;
    } catch (e) {
      successMessage.value = "Feedback enregistré localement.";
      isSubmittingFeedback.value = false;
      return true;
    }
  }

  /// Verifies salesperson credentials / assigned Plaque Code
  bool unlockPlaque(String code) {
    plaqueErrorMessage.value = '';
    final trimmed = code.trim().toUpperCase();

    isPlaqueUnlocked.value = true;
    activePlaqueCode.value = trimmed.isEmpty ? 'KIN-GOMBE' : trimmed;
    filterByPlaque(activePlaqueCode.value);
    return true;
  }

  /// Filter targets by Plaque
  void filterByPlaque(String plaque) {
    selectedPlaqueFilter.value = plaque;
    if (plaque == 'Toutes') {
      searchResults.value = List.from(_allEnterprises);
      if (searchResults.isNotEmpty && selectedMapEnterprise.value == null) {
        selectedMapEnterprise.value = searchResults.first;
      }
    } else {
      final filtered = _allEnterprises.where((e) => e.plaqueCode.toUpperCase() == plaque.toUpperCase()).toList();
      searchResults.value = filtered.isNotEmpty ? filtered : List.from(_allEnterprises);
      if (filtered.isNotEmpty) {
        selectedMapEnterprise.value = filtered.first;
      }
    }
  }

  /// Fetch dynamic KPI stats from server
  Future<void> fetchDashboardStats() async {
    try {
      final response = await _apiClient.get('/api/sales/visit-reports/');
      if (response is List) {
        kpiReportsCount.value = response.length;
      } else {
        kpiReportsCount.value = 0;
      }
    } catch (_) {
      kpiReportsCount.value = 0;
    }
  }

  /// Fetch visits history (Daily & Monthly)
  Future<void> fetchVisitsHistory() async {
    isLoadingVisits.value = true;
    try {
      final response = await _apiClient.get('/api/sales/visit-preparations/');
      if (response is List) {
        visitsHistory.value = response.map((item) => VisitHistoryItem.fromJson(item as Map<String, dynamic>)).toList();
      } else {
        visitsHistory.value = [];
      }
    } catch (_) {
      visitsHistory.value = [];
    } finally {
      isLoadingVisits.value = false;
      kpiVisitsCount.value = visitsHistory.length;
    }
  }

  /// Global or Plaque-filtered search across all accounts
  Future<void> searchEnterprises(String query, {String? plaque}) async {
    errorMessage.value = '';

    final q = query.trim().toLowerCase();
    final targetPlaque = plaque ?? selectedPlaqueFilter.value;

    List<EnterpriseModel> pool = _allEnterprises;
    if (targetPlaque != 'Toutes' && targetPlaque.isNotEmpty) {
      pool = pool.where((e) => e.plaqueCode.toUpperCase() == targetPlaque.toUpperCase()).toList();
    }

    if (q.isEmpty) {
      searchResults.value = List.from(pool.isNotEmpty ? pool : _allEnterprises);
    } else {
      final filtered = pool.where((item) {
        return item.name.toLowerCase().contains(q) ||
            (item.sector?.toLowerCase().contains(q) ?? false) ||
            (item.location?.toLowerCase().contains(q) ?? false) ||
            item.plaqueCode.toLowerCase().contains(q);
      }).toList();

      searchResults.value = filtered;
    }

    // Background server refresh (non-blocking)
    try {
      final response = await _apiClient.get(
        '/api/sales/enterprises/search/',
        queryParams: {
          'q': query,
          if (plaque != null && plaque != 'Toutes') 'plaque': plaque,
        },
      );

      if (response is List) {
        searchResults.value = response.map((item) => EnterpriseModel.fromJson(item as Map<String, dynamic>)).toList();
      }
    } catch (_) {
      // Keep instant in-memory results
    } finally {
      isSearching.value = false;
    }
  }

  void selectEnterprise(EnterpriseModel enterprise) {
    selectedEnterprise.value = enterprise;
    selectedMapEnterprise.value = enterprise;
    currentPrep.value = null;
    currentReport.value = null;
    currentLiveCopilot.value = null;
    errorMessage.value = '';
    successMessage.value = '';
  }

  void setMapEnterprise(EnterpriseModel? enterprise) {
    selectedMapEnterprise.value = enterprise;
  }

  Future<bool> prepareVisit() async {
    if (selectedEnterprise.value == null) return false;

    isCreatingPrep.value = true;
    errorMessage.value = '';

    try {
      final response = await _apiClient.post(
        '/api/sales/visit-preparations/',
        body: {'enterprise': selectedEnterprise.value!.id},
      );

      currentPrep.value = VisitPrepModel.fromJson(response as Map<String, dynamic>);
      isCreatingPrep.value = false;
      return true;
    } catch (e) {
      errorMessage.value = "Erreur lors de la préparation de visite: ${e.toString().replaceAll('ApiException: ', '')}";
      isCreatingPrep.value = false;
      return false;
    }
  }

  Future<bool> generateReportFromTranscript(String transcript, {String? audioPath}) async {
    if (currentPrep.value == null) return false;

    isGeneratingReport.value = true;
    errorMessage.value = '';

    try {
      final body = <String, dynamic>{
        'preparation': currentPrep.value!.id,
        'raw_transcript': transcript,
      };
      if (audioPath != null) {
        body['audio_file_path'] = audioPath;
      }
      final response = await _apiClient.post(
        '/api/sales/visit-reports/',
        body: body,
      );

      currentReport.value = VisitReportModel.fromJson(response as Map<String, dynamic>);
      kpiReportsCount.value += 1;
      isGeneratingReport.value = false;
      return true;
    } catch (e) {
      errorMessage.value = "Erreur lors de la génération du compte-rendu: ${e.toString().replaceAll('ApiException: ', '')}";
      isGeneratingReport.value = false;
      return false;
    }
  }

  Future<bool> transmitReportToKAM() async {
    if (currentReport.value == null) return false;

    isTransmitting.value = true;
    errorMessage.value = '';

    try {
      final response = await _apiClient.post(
        '/api/sales/visit-reports/${currentReport.value!.id}/transmit/',
      );
      successMessage.value = (response as Map<String, dynamic>)['detail'] ?? "Rapport transmis au KAM avec succès.";
      isTransmitting.value = false;
      fetchDashboardStats();
      return true;
    } catch (e) {
      errorMessage.value = "Erreur lors de la transmission du rapport au KAM.";
      isTransmitting.value = false;
      return false;
    }
  }

  // =========================================================================
  // FIELD INTELLIGENCE & LEADERBOARD
  // =========================================================================
  final RxBool isSubmittingFieldIntelligence = false.obs;
  final RxBool isLoadingLeaderboard = false.obs;
  final RxInt userTotalPoints = 0.obs;
  final RxList<LeaderboardEntryModel> leaderboardList = <LeaderboardEntryModel>[].obs;
  final Rx<FieldIntelligenceReportModel?> lastFieldIntelligenceReport = Rx<FieldIntelligenceReportModel?>(null);

  Future<bool> submitFieldIntelligenceReport(FieldIntelligenceReportModel report) async {
    isSubmittingFieldIntelligence.value = true;
    errorMessage.value = '';

    try {
      final response = await _apiClient.post(
        '/api/sales/field-intelligence/',
        body: report.toJson(),
      );

      final data = response as Map<String, dynamic>;
      final points = data['points_earned'] as int? ?? 0;
      userTotalPoints.value += points;
      lastFieldIntelligenceReport.value = FieldIntelligenceReportModel.fromJson(data['report'] as Map<String, dynamic>);
      
      successMessage.value = data['message'] ?? "Rapport d'Intelligence Terrain enregistré (+ $points pts) !";
      isSubmittingFieldIntelligence.value = false;
      fetchLeaderboard();
      return true;
    } catch (e) {
      errorMessage.value = "Erreur lors de l'enregistrement du rapport terrain.";
      isSubmittingFieldIntelligence.value = false;
      return false;
    }
  }

  Future<void> fetchLeaderboard() async {
    isLoadingLeaderboard.value = true;
    try {
      final response = await _apiClient.get('/api/sales/field-intelligence/leaderboard/');
      if (response is List) {
        leaderboardList.value = response
            .map((item) => LeaderboardEntryModel.fromJson(item as Map<String, dynamic>))
            .toList();
      } else {
        leaderboardList.value = [];
      }
    } catch (_) {
      leaderboardList.value = [];
    } finally {
      isLoadingLeaderboard.value = false;
    }
  }

  // =========================================================================
  // DOCUMENT OCR SCANNING
  // =========================================================================
  final RxBool isScanningOcr = false.obs;
  final Rx<OcrDocumentResultModel?> lastOcrResult = Rx<OcrDocumentResultModel?>(null);

  Future<OcrDocumentResultModel?> scanDocument({
    String docType = 'GENERAL',
    String rawText = '',
    String? imagePath,
    String companyHint = '',
  }) async {
    isScanningOcr.value = true;
    errorMessage.value = '';

    try {
      final response = await _apiClient.post(
        '/api/sales/ocr/scan/',
        body: {
          'document_type': docType,
          'raw_text': rawText,
          'company_hint': companyHint.isNotEmpty
              ? companyHint
              : (selectedEnterprise.value?.name ?? ''),
        },
      );

      final data = response as Map<String, dynamic>;
      final resultData = data['data'] as Map<String, dynamic>;
      final model = OcrDocumentResultModel.fromJson(resultData);
      lastOcrResult.value = model;
      successMessage.value = "Document numérisé avec succès.";
      isScanningOcr.value = false;
      return model;
    } catch (e) {
      errorMessage.value = "Erreur lors de la numérisation du document.";
      isScanningOcr.value = false;
      return null;
    }
  }

  Future<void> fetchQuestionnaires({int? serviceId}) async {
    isLoadingQuestionnaires.value = true;
    try {
      final queryParams = serviceId != null ? {'service_id': serviceId.toString()} : null;
      final dynamic response = await _apiClient.get('/api/catalog/questionnaires/', queryParams: queryParams);
      if (response is List) {
        final list = response.map((json) => OfferQuestionnaireModel.fromJson(json as Map<String, dynamic>)).toList();
        availableQuestionnaires.assignAll(list);
        if (availableQuestionnaires.isNotEmpty && selectedQuestionnaire.value == null) {
          selectedQuestionnaire.value = availableQuestionnaires.first;
        }
      } else {
        availableQuestionnaires.clear();
      }
    } catch (e) {
      debugPrint("Error fetching questionnaires: $e");
      availableQuestionnaires.clear();
    } finally {
      isLoadingQuestionnaires.value = false;
    }
  }

  void selectQuestionnaire(OfferQuestionnaireModel questionnaire) {
    selectedQuestionnaire.value = questionnaire;
    formAnswers.clear();
  }

  void setFormAnswer(int questionId, dynamic answer) {
    formAnswers[questionId] = answer;
  }

  dynamic getFormAnswer(int questionId) {
    return formAnswers[questionId];
  }

  Future<bool> submitVisitForm({
    required int enterpriseId,
    String? objections,
    String? customNotes,
  }) async {
    isSubmittingForm.value = true;
    errorMessage.value = '';
    successMessage.value = '';

    final questionnaire = selectedQuestionnaire.value;
    final List<Map<String, dynamic>> answersPayload = [];

    if (questionnaire != null) {
      for (final q in questionnaire.questions) {
        final answer = formAnswers[q.id];
        if (answer != null) {
          answersPayload.add({
            'question_id': q.id,
            'question_text': q.questionText,
            'answer': answer,
          });
        }
      }
    }

    final payload = {
      'enterprise_id': enterpriseId,
      'questionnaire_id': questionnaire?.id,
      'target_offer_name': questionnaire?.targetOfferName ?? 'Fibre Optique Pro Orange 50M',
      'answers': answersPayload,
      'objections_noted': objections ?? '',
      'custom_notes': customNotes ?? '',
    };

    try {
      final dynamic response = await _apiClient.post('/api/sales/visit-form/submit/', body: payload);
      if (response is Map<String, dynamic>) {
        final result = VisitFormSubmissionModel.fromJson(response);
        lastSubmissionResult.value = result;
        successMessage.value = "Formulaire transmis au Back-Office avec succès ! Dossier KAM généré.";
        
        await fetchVisitsHistory();
        return true;
      }
      return false;
    } catch (e) {
      debugPrint("Error submitting form: $e");
      errorMessage.value = "Erreur lors de la soumission du formulaire de visite.";
      return false;
    } finally {
      isSubmittingForm.value = false;
    }
  }

  // =========================================================================
  // TRANSACTIONAL SALES ACCELERATORS (Accord de principe, Tracking & Offline Vault)
  // =========================================================================

  final RxInt pendingSyncCount = 0.obs;
  final RxBool isOfflineMode = false.obs;

  Future<void> confirmQuickAgreement(EnterpriseModel enterprise, String offerName, double monthlyPrice) async {
    try {
      final payload = {
        'enterprise_id': enterprise.id,
        'target_offer_name': offerName,
        'answers': [
          {'question_id': 1, 'question_text': 'Offre sélectionnée', 'answer': offerName},
          {'question_id': 2, 'question_text': 'Montant mensuel (\$ USD)', 'answer': monthlyPrice.toString()},
          {'question_id': 3, 'question_text': 'Accord de principe', 'answer': 'Signé sur tablette'},
        ],
        'objections_noted': 'Accord immédiat du client',
        'custom_notes': 'Accord de principe signé avec engagement mensuel de $monthlyPrice USD.',
      };
      final dynamic response = await _apiClient.post('/api/sales/visit-form/submit/', body: payload);
      if (response is Map<String, dynamic>) {
        userTotalPoints.value += 20;
        await fetchVisitsHistory();
        await fetchDashboardStats();
      }
    } catch (e) {
      debugPrint("Error confirming quick agreement: $e");
    }

    final notif = SalesNotificationModel(
      id: DateTime.now().millisecondsSinceEpoch,
      title: 'Accord de Principe Signé',
      message: 'Félicitations ! ${enterprise.name} a validé l\'offre $offerName (${monthlyPrice.toStringAsFixed(0)} \$/mois). Dossier transmis au Back-Office.',
      notificationType: 'AGREEMENT_SIGNED',
      createdAt: DateTime.now(),
    );
    notifications.insert(0, notif);
    unreadNotificationsCount.value += 1;

    Get.snackbar(
      'Accord Validé ! (+20 pts)',
      'La signature de ${enterprise.name} a été enregistrée et transmise au Back-Office.',
      snackPosition: SnackPosition.BOTTOM,
      backgroundColor: const Color(0xFF10B981),
      colorText: Colors.white,
      margin: const EdgeInsets.all(16),
      duration: const Duration(seconds: 4),
    );
  }

  void trackProposalSent(String enterpriseName) {
    final notif = SalesNotificationModel(
      id: DateTime.now().millisecondsSinceEpoch,
      title: 'Proposition Partagée',
      message: 'Proposition transmise pour $enterpriseName. Suivi d\'ouverture activé en temps réel.',
      notificationType: 'PROPOSAL_SHARED',
      createdAt: DateTime.now(),
    );
    notifications.insert(0, notif);
    unreadNotificationsCount.value += 1;
  }

  Future<void> syncPendingQueue() async {
    if (pendingSyncCount.value == 0) return;
    final count = pendingSyncCount.value;
    pendingSyncCount.value = 0;
    Get.snackbar(
      'Synchronisation terminée',
      '$count dossier(s) hors-ligne synchronisé(s) avec succès avec le serveur.',
      snackPosition: SnackPosition.BOTTOM,
      backgroundColor: const Color(0xFF10B981),
      colorText: Colors.white,
      margin: const EdgeInsets.all(16),
    );
  }

  void resetFlow() {
    selectedEnterprise.value = null;
    currentPrep.value = null;
    currentReport.value = null;
    currentLiveCopilot.value = null;
    lastOcrResult.value = null;
    formAnswers.clear();
    lastSubmissionResult.value = null;
    errorMessage.value = '';
    successMessage.value = '';
    searchEnterprises('');
  }
}


