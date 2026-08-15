import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../view_models/catalog_view_model.dart';

class CatalogView extends StatefulWidget {
  const CatalogView({super.key});

  @override
  State<CatalogView> createState() => _CatalogViewState();
}

class _CatalogViewState extends State<CatalogView> {
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CatalogViewModel>().fetchCatalog();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final catalogVm = context.watch<CatalogViewModel>();
    final categories = ["Toutes", "Télécom", "Cybersécurité", "Cloud", "Santé"];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Catalogue Solutions MSP'),
      ),
      body: Column(
        children: [
          // Search & Filter Header
          Container(
            padding: const EdgeInsets.all(16),
            color: const Color(0xFF0F172A),
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  onChanged: (val) => catalogVm.searchCatalog(val),
                  style: const TextStyle(color: Colors.white),
                  decoration: const InputDecoration(
                    hintText: 'Rechercher une offre (Fibre, Firewall, Teams...)',
                    hintStyle: TextStyle(color: Color(0xFF94A3B8)),
                    filled: true,
                    fillColor: Color(0xFF1E293B),
                    prefixIcon: Icon(Icons.search_rounded, color: Color(0xFFF97316)),
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 36,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: categories.length,
                    itemBuilder: (context, index) {
                      final category = categories[index];
                      final isSelected = catalogVm.selectedCategory == category;

                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(category),
                          selected: isSelected,
                          onSelected: (_) => catalogVm.filterByCategory(category),
                          selectedColor: const Color(0xFFF97316),
                          labelStyle: TextStyle(
                            color: isSelected ? Colors.white : const Color(0xFF94A3B8),
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                            fontSize: 12,
                          ),
                          backgroundColor: const Color(0xFF1E293B),
                          side: BorderSide.none,
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),

          // Items List
          Expanded(
            child: catalogVm.isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFFF97316)))
                : catalogVm.filteredItems.isEmpty
                    ? const Center(child: Text('Aucune offre MSP trouvée.'))
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: catalogVm.filteredItems.length,
                        itemBuilder: (context, index) {
                          final item = catalogVm.filteredItems[index];

                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: Colors.blue.withOpacity(0.12),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          item.category,
                                          style: const TextStyle(
                                            color: Colors.blue,
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                      Text(
                                        '${item.monthlyPrice.toStringAsFixed(2)} €/mois',
                                        style: const TextStyle(
                                          color: Color(0xFFF97316),
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 10),
                                  Text(
                                    item.name,
                                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    item.description,
                                    style: const TextStyle(color: Color(0xFF64748B), fontSize: 13, height: 1.4),
                                  ),
                                  if (item.setupPrice > 0) ...[
                                    const SizedBox(height: 10),
                                    Text(
                                      'Frais d\'accès au service : ${item.setupPrice.toStringAsFixed(2)} €',
                                      style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
