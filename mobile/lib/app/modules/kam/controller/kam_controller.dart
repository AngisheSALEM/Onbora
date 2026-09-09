import 'package:get/get.dart';
import '../model/kam_account_model.dart';
import '../model/kam_briefing_model.dart';
import '../../../core/api/api_client.dart';
import '../../../routes/app_routes.dart';

class KamController extends GetxController {
  final ApiClient _apiClient = Get.isRegistered<ApiClient>() ? Get.find<ApiClient>() : ApiClient();

  final RxBool isLoading = false.obs;
  final RxString searchQuery = ''.obs;
  final Rx<AccountHealthStatus?> selectedHealthFilter = Rx<AccountHealthStatus?>(null);

  final RxList<KamAccountModel> allAccounts = <KamAccountModel>[].obs;
  final RxList<KamAccountModel> filteredAccounts = <KamAccountModel>[].obs;
  final Rx<KamAccountModel?> selectedAccount = Rx<KamAccountModel?>(null);
  final Rx<KamBriefingModel?> currentBriefing = Rx<KamBriefingModel?>(null);

  // Indicateurs clés du portefeuille KAM
  final RxDouble totalMrrManaged = 0.0.obs;
  final RxInt totalAccountsCount = 0.obs;
  final RxInt criticalAlertsCount = 0.obs;
  final RxInt renewalImminentCount = 0.obs;

  @override
  void onInit() {
    super.onInit();
    loadKamData();
    debounce(searchQuery, (_) => applyFilters(), time: const Duration(milliseconds: 250));
  }

  Future<void> loadKamData() async {
    isLoading.value = true;
    try {
      final response = await _apiClient.get('/api/kam/accounts/');
      List rawAccounts = [];
      if (response is Map<String, dynamic> && response['accounts'] is List) {
        rawAccounts = response['accounts'] as List;
      } else if (response is List) {
        rawAccounts = response;
      }

      if (rawAccounts.isNotEmpty) {
        final parsed = rawAccounts
            .map((e) => KamAccountModel.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList();
        allAccounts.assignAll(parsed);
      } else {
        allAccounts.clear();
      }

      _recomputeKpis();
    } catch (e) {
      allAccounts.clear();
      _recomputeKpis();
    } finally {
      applyFilters();
      if (filteredAccounts.isNotEmpty) {
        selectAccount(filteredAccounts.first);
      } else {
        selectedAccount.value = null;
        currentBriefing.value = null;
      }
      isLoading.value = false;
    }
  }

  void _recomputeKpis() {
    totalAccountsCount.value = allAccounts.length;
    double mrr = 0.0;
    for (final acc in allAccounts) {
      final cleaned = acc.monthlyRevenueOrange.replaceAll(RegExp(r'[^0-9.]'), '');
      mrr += double.tryParse(cleaned) ?? 0.0;
    }
    totalMrrManaged.value = mrr;
    criticalAlertsCount.value = allAccounts.where((a) => a.healthStatus == AccountHealthStatus.critical).length;
    renewalImminentCount.value = allAccounts.where((a) => a.activeContracts.any((c) => c.isRenewalImminent)).length;
  }

  void setHealthFilter(AccountHealthStatus? status) {
    if (selectedHealthFilter.value == status) {
      selectedHealthFilter.value = null;
    } else {
      selectedHealthFilter.value = status;
    }
    applyFilters();
  }

  void applyFilters() {
    final query = searchQuery.value.trim().toLowerCase();
    final filter = selectedHealthFilter.value;

    filteredAccounts.assignAll(
      allAccounts.where((account) {
        final matchesQuery = query.isEmpty ||
            account.name.toLowerCase().contains(query) ||
            account.sector.toLowerCase().contains(query) ||
            account.headquarters.toLowerCase().contains(query);

        final matchesHealth = filter == null || account.healthStatus == filter;

        return matchesQuery && matchesHealth;
      }).toList(),
    );
  }

  void selectAccount(KamAccountModel account) {
    selectedAccount.value = account;
    // Génération du briefing associé
    currentBriefing.value = KamBriefingModel(
      accountId: account.id,
      accountName: account.name,
      sector: account.sector,
      visitDate: account.nextVisitDate ?? "Planifié",
      visitTime: account.nextVisitTime ?? "14h00",
      visitLocation: account.headquarters,
      estimatedReadTimeMinutes: 4,
      primaryObjective: account.nextVisitObjective ?? "Revue de compte et identification des opportunités",
      idealOutcome: "Accord pour lancer un audit technique & validation de la liste des décideurs.",
      suggestedAgenda: [
        "1. Bilan de satisfaction et qualité de service Orange (10 min)",
        "2. Nouveaux enjeux business du client (Expansion, Digital) (15 min)",
        "3. Présentation de la recommandation Orange sur mesure (15 min)",
        "4. Prochaines étapes et calendrier de décision (5 min)",
      ],
      trapsToAvoid: [
        if (account.healthStatus == AccountHealthStatus.critical)
          "Ne PAS démarrer par un pitch commercial sans avoir d'abord adressé le rapport d'incident récent.",
        "Ne pas aborder le prix avant d'avoir validé l'impact financier de l'indisponibilité réseau.",
      ],
      meetingAttendees: account.stakeholders,
      missingKeyPeople: account.missingStakeholders,
      painHypotheses: account.painHypotheses,
      currentOrangeServices: account.activeContracts,
      openIncidentsCount: account.healthStatus == AccountHealthStatus.critical ? 1 : 0,
      incidentsSummary: account.healthReason,
      lastInteractions: [
        "12/08/2026 : Échange téléphonique avec le DSI sur la performance réseau.",
        "28/07/2026 : Envoi du rapport mensuel de disponibilité SLA (99.95%).",
      ],
      isPrepared: false,
    );
  }

  void openBriefingForAccount(KamAccountModel account) {
    selectAccount(account);
    Get.toNamed(Routes.KAM_BRIEFING);
  }

  void openAccountDetail(KamAccountModel account) {
    selectAccount(account);
    Get.toNamed(Routes.KAM_ACCOUNT_DETAIL);
  }
}
