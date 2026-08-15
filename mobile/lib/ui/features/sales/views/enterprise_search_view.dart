import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../view_models/sales_view_model.dart';
import 'visit_preparation_view.dart';

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
    // Default search sample
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SalesViewModel>().searchEnterprises('Clinique');
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
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
                    onSubmitted: (val) => salesVm.searchEnterprises(val),
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: 'Nom d\'entreprise, SIREN, secteur...',
                      hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
                      filled: true,
                      fillColor: const Color(0xFF1E293B),
                      prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFFF97316)),
                      suffixIcon: _searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear_rounded, color: Colors.grey),
                              onPressed: () {
                                _searchController.clear();
                                salesVm.searchEnterprises('');
                              },
                            )
                          : null,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                ElevatedButton(
                  onPressed: () => salesVm.searchEnterprises(_searchController.text),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  ),
                  child: const Text('Chercher'),
                ),
              ],
            ),
          ),

          // Loading or Results List
          Expanded(
            child: salesVm.isSearching
                ? const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        CircularProgressIndicator(color: Color(0xFFF97316)),
                        SizedBox(height: 16),
                        Text('Interrogation CRM Kaabu & BDD local...'),
                      ],
                    ),
                  )
                : salesVm.searchResults.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.search_off_rounded, size: 64, color: Colors.grey.shade400),
                            const SizedBox(height: 16),
                            const Text(
                              'Aucune entreprise trouvée',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'Essayez un terme comme "Clinique", "Tech" ou "Boutique"',
                              style: TextStyle(color: Colors.grey, fontSize: 13),
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
                                        color: Colors.green.withOpacity(0.15),
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
