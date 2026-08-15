import '../../core/api/api_client.dart';
import '../models/catalog_item_model.dart';

class CatalogRepository {
  final ApiClient _apiClient;

  CatalogRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  Future<List<CatalogItemModel>> getCatalog() async {
    try {
      final response = await _apiClient.get('/api/catalog/services/');
      if (response is List) {
        return response.map((item) => CatalogItemModel.fromJson(item as Map<String, dynamic>)).toList();
      }
    } catch (_) {
      // Fallback mock catalog if offline or endpoint not yet seeded
    }

    return [
      CatalogItemModel(
        id: 1,
        name: "Fibre Optique Pro (FTTO/FTTH)",
        category: "Télécom & Réseau",
        description: "Débit symétrique garanti jusqu'à 1 Gbps avec GTR 4h et secours 4G automatique.",
        monthlyPrice: 149.00,
        setupPrice: 350.00,
        isEligibleDefault: true,
      ),
      CatalogItemModel(
        id: 2,
        name: "Microsoft 365 Business Premium & Teams",
        category: "Collaboration Cloud",
        description: "Suite bureautique cloud complète, visioconférence Teams et protection Endpoint Defender.",
        monthlyPrice: 19.80,
        setupPrice: 0.00,
        isEligibleDefault: true,
      ),
      CatalogItemModel(
        id: 3,
        name: "Firewall Managé Next-Gen",
        category: "Cybersécurité",
        description: "Pare-feu managé avec filtrage DNS, VPN IPSec nomade et inspection antivirus en temps réel.",
        monthlyPrice: 89.00,
        setupPrice: 200.00,
        isEligibleDefault: true,
      ),
      CatalogItemModel(
        id: 4,
        name: "Téléphonie d'Entreprise VoIP Teams",
        category: "Télécom",
        description: "Standard téléphonique 100% cloud intégré directement dans Microsoft Teams.",
        monthlyPrice: 12.50,
        setupPrice: 50.00,
        isEligibleDefault: true,
      ),
      CatalogItemModel(
        id: 5,
        name: "Hébergement Données de Santé (HDS)",
        category: "Cloud & Santé",
        description: "Sauvegarde & hébergement hautement sécurisé certifié HDS pour cabinets et cliniques.",
        monthlyPrice: 299.00,
        setupPrice: 500.00,
        isEligibleDefault: false,
      ),
    ];
  }
}
