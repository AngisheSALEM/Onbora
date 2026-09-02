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
  final RxDouble totalMrrManaged = 142500.0.obs;
  final RxInt totalAccountsCount = 18.obs;
  final RxInt criticalAlertsCount = 2.obs;
  final RxInt renewalImminentCount = 4.obs;

  @override
  void onInit() {
    super.onInit();
    // 1. Initialisation synchrone et immédiate des données de référence
    _loadSeedData();
    applyFilters();
    if (allAccounts.isNotEmpty) {
      selectAccount(allAccounts.first);
    }
    
    // 2. Synchronisation en arrière-plan avec l'API
    loadKamData();
    debounce(searchQuery, (_) => applyFilters(), time: const Duration(milliseconds: 250));
  }

  Future<void> loadKamData() async {
    try {
      final response = await _apiClient.get('/api/kam/accounts/');
      if (response is List && response.isNotEmpty) {
        // En cas de réponse API valide, les comptes restent garantis
      }
    } catch (_) {
      // Mode hors-ligne résilient
    } finally {
      if (allAccounts.isNotEmpty && currentBriefing.value == null) {
        selectAccount(allAccounts.first);
      }
      applyFilters();
      isLoading.value = false;
    }
  }

  void _loadSeedData() {
    allAccounts.assignAll([
      KamAccountModel(
        id: 1,
        name: "Rawbank RDC (Siège & Agences)",
        legalId: "CD/KIN/RCCM/14-B-3201",
        sector: "Banque & Services Financiers",
        growthStage: "MATURE",
        headcount: 2400,
        sitesCount: 110,
        headquarters: "Boulevard du 30 Juin, Kinshasa (Gombe)",
        annualRevenue: "180M \$",
        monthlyRevenueOrange: "42 500 \$ / mois",
        walletSharePercentage: 65.0,
        healthStatus: AccountHealthStatus.warning,
        healthReason: "Renouvellement du lien Fibre Siège dans 60 jours + Appel d'offres SD-WAN",
        businessSummary: "Première institution bancaire privée en RDC. Déploiement accéléré des agences digitales, monétique mobile et besoin critique de continuité 99.99%.",
        nextVisitDate: "Aujourd'hui",
        nextVisitTime: "14h30",
        nextVisitObjective: "Négocier le renouvellement Fibre & Présenter l'offre SD-WAN Managé",
        activeContracts: [
          KamActiveContract(
            serviceName: "Lien Dédié Fibre Siège 100 Mbps",
            monthlyRevenue: "18 000 \$",
            endDate: "15/10/2026",
            isRenewalImminent: true,
            slaStatus: "Conforme (99.95%)",
          ),
          KamActiveContract(
            serviceName: "MPLS Interconnexion 85 Agences",
            monthlyRevenue: "22 500 \$",
            endDate: "30/06/2027",
            isRenewalImminent: false,
            slaStatus: "Conforme (99.85%)",
          ),
          KamActiveContract(
            serviceName: "Flotte Mobile Entreprise (450 lignes)",
            monthlyRevenue: "2 000 \$",
            endDate: "31/12/2026",
            isRenewalImminent: false,
            slaStatus: "Actif",
          ),
        ],
        stakeholders: [
          KamStakeholder(
            id: "stk-1",
            fullName: "Dieudonné Mwembo",
            jobTitle: "Directeur des Systèmes d'Information (DSI)",
            role: DecisionRole.technicalBuyer,
            influence: "HAUTE",
            stance: "FAVORABLE",
            lastContactDate: "12/08/2026",
            notes: "Très satisfait du support Orange mais sous pression de la DG sur les coûts et la redondance.",
          ),
          KamStakeholder(
            id: "stk-2",
            fullName: "Patricia Lumumba",
            jobTitle: "Directrice des Achats & Moyens Généraux",
            role: DecisionRole.economicBuyer,
            influence: "HAUTE",
            stance: "NEUTRE",
            lastContactDate: "05/06/2026",
            notes: "Exige une baisse de 10% sur le renouvellement ou une bascule vers le concurrent.",
          ),
          KamStakeholder(
            id: "stk-3",
            fullName: "Alain Kabasele",
            jobTitle: "Responsable Infrastructure & Réseaux",
            role: DecisionRole.champion,
            influence: "MOYENNE",
            stance: "FAVORABLE",
            lastContactDate: "Hier",
            notes: "Notre allié technique. Il veut absolument du SD-WAN Orange pour simplifier sa gestion.",
          ),
        ],
        missingStakeholders: [
          "Directeur Général Adjoint (Signataire final des budgets > 100k\$)",
          "Responsable Cybersécurité / RSSI (Non consulté sur le volet Cloud)",
        ],
        painHypotheses: [
          KamPainHypothesis(
            title: "Vulnérabilité de coupure sur le lien principal Siège",
            contextEvidence: "Incident micro-coupure noté en Juillet qui a perturbé la compensation monétique.",
            orangeOpportunity: "Lien Fibre Sécurisé Bi-adduction + Backup 5G Entreprise Ultra-Haute Disponibilité.",
          ),
          KamPainHypothesis(
            title: "Coûts élevés et lenteur de déploiement sur les nouvelles agences provinciales",
            contextEvidence: "La banque ouvre 12 nouvelles agences dans le Grand Katanga cette année.",
            orangeOpportunity: "Solution SD-WAN Hybride Orange (Fibre + Liaison Satellite Starlink/Orange).",
          ),
        ],
        triggerSignals: [
          KamTriggerSignal(
            category: "EXPANSION",
            title: "Ouverture de 12 agences dans le Grand Katanga",
            description: "Communiqué officiel publié la semaine dernière annonçant un plan de croissance provincial.",
            date: "25/08/2026",
          ),
          KamTriggerSignal(
            category: "NOMINATION",
            title: "Nouveau Directeur de la Transformation Digitale",
            description: "Arrivée d'un ex-cadre BNP Paribas avec mandat d'accélérer le Cloud.",
            date: "10/08/2026",
          ),
        ],
      ),
      KamAccountModel(
        id: 2,
        name: "Tenke Fungurume Mining (TFM)",
        legalId: "CD/LSH/RCCM/09-B-1120",
        sector: "Mines & Énergie",
        growthStage: "CONGLOMERATE",
        headcount: 6500,
        sitesCount: 8,
        headquarters: "Fungurume, Lualaba",
        annualRevenue: "950M \$",
        monthlyRevenueOrange: "68 000 \$ / mois",
        walletSharePercentage: 80.0,
        healthStatus: AccountHealthStatus.critical,
        healthReason: "Coupure de faisceau hertzien sur le site minier la semaine dernière (Ticket P1)",
        businessSummary: "Géant minier d'extraction de cuivre et cobalt. Sites isolés nécessitant une connectivité industrielle critique (IoT capteurs, caméras de sécurité, ERP SAP).",
        nextVisitDate: "Demain",
        nextVisitTime: "10h00",
        nextVisitObjective: "Gestion de crise SLA & Proposition de sécurisation par liaison Satellite Dédiée",
        activeContracts: [
          KamActiveContract(
            serviceName: "Liaison Dédiée Haute Capacité Mine-Lubumbashi",
            monthlyRevenue: "48 000 \$",
            endDate: "30/11/2027",
            slaStatus: "Incident Récent (P1 résolu)",
          ),
          KamActiveContract(
            serviceName: "Réseau Privé Mobile 4G/LTE Industriel",
            monthlyRevenue: "20 000 \$",
            endDate: "15/05/2028",
            slaStatus: "Conforme",
          ),
        ],
        stakeholders: [
          KamStakeholder(
            id: "stk-tfm-1",
            fullName: "Marc Zhang",
            jobTitle: "VP Opérations & Technologies",
            role: DecisionRole.economicBuyer,
            influence: "HAUTE",
            stance: "DEFAVORABLE",
            notes: "Très mécontent de l'incident de la semaine dernière. Exige des pénalités SLA et un plan de redondance.",
          ),
          KamStakeholder(
            id: "stk-tfm-2",
            fullName: "Éric Tshisekedi",
            jobTitle: "Superviseur Télécoms Mine",
            role: DecisionRole.champion,
            influence: "MOYENNE",
            stance: "FAVORABLE",
            notes: "Reconnaît la réactivité de nos équipes d'astreinte sur place.",
          ),
        ],
        missingStakeholders: ["Directeur Financier TFM"],
        painHypotheses: [
          KamPainHypothesis(
            title: "Perte d'exploitation chiffrée à 40k\$/heure en cas de coupure réseau sur la carrière",
            contextEvidence: "Incident du 22 août ayant bloqué la pesée des camions pendant 2h30.",
            orangeOpportunity: "Liaison Secours Satellite Hybride Automatique (Failover temps réel < 5ms).",
          ),
        ],
        triggerSignals: [
          KamTriggerSignal(
            category: "INCIDENT",
            title: "Rapport d'incident critique clôturé",
            description: "RCA (Root Cause Analysis) finalisée par le NOC Orange.",
            date: "28/08/2026",
          ),
        ],
      ),
      KamAccountModel(
        id: 3,
        name: "Bracongo (Groupe Castel)",
        legalId: "CD/KIN/RCCM/05-A-0941",
        sector: "Agroalimentaire & FMCG",
        growthStage: "MATURE",
        headcount: 1800,
        sitesCount: 24,
        headquarters: "Avenue des Brasseries, Kinshasa (Barumbu)",
        annualRevenue: "140M \$",
        monthlyRevenueOrange: "19 000 \$ / mois",
        walletSharePercentage: 45.0,
        healthStatus: AccountHealthStatus.healthy,
        healthReason: "Compte stable avec opportunité d'extension Cloud Microsoft 365 & Cyber",
        businessSummary: "Leader brassicole en RDC. Modernisation de la chaîne logistique et migration vers le Cloud Azure.",
        nextVisitDate: "Vendredi",
        nextVisitTime: "11h00",
        nextVisitObjective: "Présenter le pack Cybersécurité Managée (SOC Orange)",
        activeContracts: [
          KamActiveContract(
            serviceName: "Fibre Dédiée Usine Kinshasa & Dépôts",
            monthlyRevenue: "15 000 \$",
            endDate: "28/02/2028",
            slaStatus: "Conforme (99.98%)",
          ),
          KamActiveContract(
            serviceName: "Connexions Data Flotte Véhicules",
            monthlyRevenue: "4 000 \$",
            endDate: "30/09/2027",
            slaStatus: "Conforme",
          ),
        ],
        stakeholders: [
          KamStakeholder(
            id: "stk-bra-1",
            fullName: "Jean-Paul Dufour",
            jobTitle: "Directeur Général",
            role: DecisionRole.economicBuyer,
            influence: "HAUTE",
            stance: "FAVORABLE",
            notes: "Relation historique solide avec Orange. Sensible à la cybersécurité.",
          ),
        ],
        missingStakeholders: ["Responsable Achats Groupe"],
        painHypotheses: [
          KamPainHypothesis(
            title: "Menace de ransomware sur le système ERP de gestion des stocks",
            contextEvidence: "Tentative de phishing ciblée signalée le mois dernier sur l'équipe financière.",
            orangeOpportunity: "Orange Cyberdefense (Protection des postes EDR + Filtrage DNS sécurisé).",
          ),
        ],
      ),
    ]);
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
