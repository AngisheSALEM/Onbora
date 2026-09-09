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
      // Offline fallback
    }

    return [];
  }
}
