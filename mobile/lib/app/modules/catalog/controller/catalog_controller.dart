import 'package:get/get.dart';
import '../model/catalog_item_model.dart';
import '../../../core/api/api_client.dart';

class CatalogController extends GetxController {
  final ApiClient _apiClient = Get.find<ApiClient>();

  final RxList<CatalogItemModel> _items = <CatalogItemModel>[].obs;
  List<CatalogItemModel> get items => _items;

  final RxList<CatalogItemModel> _filteredItems = <CatalogItemModel>[].obs;
  List<CatalogItemModel> get filteredItems => _filteredItems;

  final RxBool isLoading = false.obs;

  final RxString _selectedCategory = "Toutes".obs;
  String get selectedCategory => _selectedCategory.value;

  final RxString searchQuery = "".obs;

  @override
  void onInit() {
    super.onInit();
    fetchCatalog();
  }

  Future<void> fetchCatalog() async {
    isLoading.value = true;

    try {
      final itemsFuture = _fetchCatalogFromApi();
      final delayFuture = Future.delayed(const Duration(milliseconds: 500));
      final res = await Future.wait([itemsFuture, delayFuture]);
      _items.value = res[0] as List<CatalogItemModel>;
      _filterItems();
    } finally {
      isLoading.value = false;
    }
  }

  Future<List<CatalogItemModel>> _fetchCatalogFromApi() async {
    try {
      final response = await _apiClient.get('/api/catalog/services/');
      if (response is List) {
        return response.map((item) => CatalogItemModel.fromJson(item as Map<String, dynamic>)).toList();
      }
    } catch (_) {
      // Offline fallback mock catalog
    }

    return [
      CatalogItemModel(
        id: 1,
        name: "Fibre Optique Pro (FTTO/FTTH)",
        category: "Télécom",
        description: "Débit symétrique garanti jusqu'à 1 Gbps avec GTR 4h et secours 4G automatique.",
        monthlyPrice: 149.00,
        setupPrice: 350.00,
        isEligibleDefault: true,
      ),
      CatalogItemModel(
        id: 2,
        name: "Microsoft 365 Business Premium & Teams",
        category: "Cloud",
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
        category: "Santé",
        description: "Sauvegarde & hébergement hautement sécurisé certifié HDS pour cabinets et cliniques.",
        monthlyPrice: 299.00,
        setupPrice: 500.00,
        isEligibleDefault: false,
      ),
    ];
  }

  void filterByCategory(String category) {
    _selectedCategory.value = category;
    _filterItems();
  }

  void searchCatalog(String query) {
    searchQuery.value = query;
    if (query.trim().isEmpty) {
      _filterItems();
    } else {
      final q = query.toLowerCase();
      _filteredItems.value = _items.where((item) {
        return item.name.toLowerCase().contains(q) ||
            item.description.toLowerCase().contains(q) ||
            item.category.toLowerCase().contains(q);
      }).toList();
    }
  }

  void _filterItems() {
    if (_selectedCategory.value == "Toutes") {
      _filteredItems.value = List.from(_items);
    } else {
      _filteredItems.value = _items.where((item) => item.category.contains(_selectedCategory.value)).toList();
    }
  }
}
