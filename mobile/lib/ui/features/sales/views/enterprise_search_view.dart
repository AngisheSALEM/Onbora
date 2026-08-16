import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../view_models/sales_view_model.dart';
import 'visit_preparation_view.dart';
import '../../../shared/skeleton_loader.dart';

class EnterpriseSearchView extends StatefulWidget {
  const EnterpriseSearchView({super.key});

  @override
  State<EnterpriseSearchView> createState() => _EnterpriseSearchViewState();
}

class _EnterpriseSearchViewState extends State<EnterpriseSearchView> {
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SalesViewModel>().searchEnterprises('Rawbank');
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _triggerSearch(String query) {
    context.read<SalesViewModel>().searchEnterprises(query.trim());
  }

  @override
  Widget build(BuildContext context) {
    final salesVm = context.watch<SalesViewModel>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Recherche Prospect CRM'),
      ),
      body: Column(
        children: [
          // Search Input Bar
          Container(
            padding: const EdgeInsets.all(16),
            color: const Color(0xFF0F172A),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    onSubmitted: _triggerSearch,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: 'Nom d\'entreprise, secteur, ville...',
                      hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
                      filled: true,
                      fillColor: const Color(0xFF1E293B),
                      prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFFF97316)),
                      suffixIcon: _searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear_rounded, color: Colors.grey),
                              onPressed: () {
                                _searchController.clear();
                                _triggerSearch('');
                              },
                            )
                          : null,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                ElevatedButton(
                  onPressed: () => _triggerSearch(_searchController.text),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  ),
                  child: const Text('Chercher'),
                ),
              ],
            ),
          ),

          // 3-Part Error State Banner
          if (salesVm.errorMessage != null)
            Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.red.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.redAccent.withValues(alpha: 0.5)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline_rounded, color: Colors.redAccent, size: 24),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Erreur de recherche CRM',
                          style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          salesVm.errorMessage!,
                          style: const TextStyle(color: Color(0xFF475569), fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

          // Results List or States
          Expanded(
            child: salesVm.isSearching
                ? const SkeletonListLoader(count: 4)
                : salesVm.searchResults.isEmpty
                    ? SingleChildScrollView(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const SizedBox(height: 40),
                            Icon(Icons.search_off_rounded, size: 64, color: Colors.grey.shade400),
                            const SizedBox(height: 16),
                            Text(
                              _searchController.text.isNotEmpty
                                  ? 'Aucun prospect trouvé pour "${_searchController.text}"'
                                  : 'Aucune entreprise trouvée',
                              textAlign: TextAlign.center,
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'Essayez l\'un des mots-clés suggérés ci-dessous :',
                              style: TextStyle(color: Color(0xFF64748B), fontSize: 13),
                            ),
                            const SizedBox(height: 20),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              alignment: WrapAlignment.center,
                              children: ['Rawbank', 'Vodacom', 'TFM', 'Clinique', 'Bracongo'].map((suggestion) {
                                return ActionChip(
                                  label: Text(suggestion),
                                  avatar: const Icon(Icons.saved_search_rounded, size: 16),
                                  onPressed: () {
                                    _searchController.text = suggestion;
                                    _triggerSearch(suggestion);
                                  },
                                );
                              }).toList(),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: salesVm.searchResults.length,
                        itemBuilder: (context, index) {
                          final enterprise = salesVm.searchResults[index];
                          final isSelected = salesVm.selectedEnterprise?.id == enterprise.id;

                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            shape: RoundedRectangleBorder(
                              side: BorderSide(
                                color: isSelected ? const Color(0xFFF97316) : Colors.transparent,
                                width: 2,
                              ),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: ListTile(
                              contentPadding: const EdgeInsets.all(16),
                              leading: CircleAvatar(
                                backgroundColor: const Color(0xFF0F172A),
                                child: Text(
                                  enterprise.name.isNotEmpty ? enterprise.name[0].toUpperCase() : 'E',
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                ),
                              ),
                              title: Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      enterprise.name,
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                    ),
                                  ),
                                  if (enterprise.syncStatus == 'SYNCED')
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: Colors.green.withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: const Text(
                                        'Sync Kaabu',
                                        style: TextStyle(color: Colors.green, fontSize: 10, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                ],
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const SizedBox(height: 6),
                                  Row(
                                    children: [
                                      const Icon(Icons.business_rounded, size: 14, color: Colors.grey),
                                      const SizedBox(width: 4),
                                      Text('${enterprise.sector} • ${enterprise.approximateSize}'),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      const Icon(Icons.location_on_rounded, size: 14, color: Colors.grey),
                                      const SizedBox(width: 4),
                                      Text(enterprise.location ?? 'Non renseigné'),
                                    ],
                                  ),
                                ],
                              ),
                              trailing: ElevatedButton(
                                onPressed: () {
                                  salesVm.selectEnterprise(enterprise);
                                  Navigator.pushReplacement(
                                    context,
                                    MaterialPageRoute(builder: (_) => const VisitPreparationView()),
                                  );
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: isSelected ? Colors.green : const Color(0xFFF97316),
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                ),
                                child: Text(isSelected ? 'Sélectionné' : 'Choisir'),
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
