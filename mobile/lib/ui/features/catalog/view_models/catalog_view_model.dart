import 'package:flutter/material.dart';
import '../../../../data/models/catalog_item_model.dart';
import '../../../../data/repositories/catalog_repository.dart';

class CatalogViewModel extends ChangeNotifier {
  final CatalogRepository _catalogRepository;

  CatalogViewModel({CatalogRepository? catalogRepository})
      : _catalogRepository = catalogRepository ?? CatalogRepository();

  List<CatalogItemModel> _items = [];
  List<CatalogItemModel> get items => _items;

  List<CatalogItemModel> _filteredItems = [];
  List<CatalogItemModel> get filteredItems => _filteredItems;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String _selectedCategory = "Toutes";
  String get selectedCategory => _selectedCategory;

  Future<void> fetchCatalog() async {
    _isLoading = true;
    notifyListeners();

    try {
      _items = await _catalogRepository.getCatalog();
      _filterItems();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void filterByCategory(String category) {
    _selectedCategory = category;
    _filterItems();
    notifyListeners();
  }

  void searchCatalog(String query) {
    if (query.trim().isEmpty) {
      _filterItems();
    } else {
      final q = query.toLowerCase();
      _filteredItems = _items.where((item) {
        return item.name.toLowerCase().contains(q) ||
            item.description.toLowerCase().contains(q) ||
            item.category.toLowerCase().contains(q);
      }).toList();
    }
    notifyListeners();
  }

  void _filterItems() {
    if (_selectedCategory == "Toutes") {
      _filteredItems = List.from(_items);
    } else {
      _filteredItems = _items.where((item) => item.category.contains(_selectedCategory)).toList();
    }
  }
}
