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
  String _selectedQuickSector = 'Toutes';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      // Fetch all enterprises on initial load
      context.read<SalesViewModel>().searchEnterprises('');
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
    final quickSectors = ['Toutes', 'Rawbank', 'Vodacom', 'TFM', 'Clinique', 'Bracongo'];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Rechercher un prospect'),
        elevation: 0,
      ),
      body: Column(
        children: [
          // Search Header Bar
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
            color: const Color(0xFF0F172A),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: const [
                    Icon(Icons.hub_rounded, color: Color(0xFFF97316), size: 22),
                    SizedBox(width: 8),
                    Text(
                      'Base Entreprises & CRM',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                const Text(
                  'Recherchez et qualifiez les comptes B2B cibles',
                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                ),
                const SizedBox(height: 16),

                // Search Input Field
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFF334155)),
                        ),
                        child: TextField(
                          controller: _searchController,
                          onSubmitted: _triggerSearch,
                          style: const TextStyle(color: Colors.white),
                          decoration: InputDecoration(
                            hintText: 'Nom d\'entreprise, secteur, ville...',
                            hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                            border: InputBorder.none,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                            prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFFF97316)),
                            suffixIcon: _searchController.text.isNotEmpty
                                ? IconButton(
                                    icon: const Icon(Icons.clear_rounded, color: Colors.grey, size: 20),
                                    onPressed: () {
                                      _searchController.clear();
                                      _triggerSearch('');
                                    },
                                  )
                                : null,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    ElevatedButton(
                      onPressed: () => _triggerSearch(_searchController.text),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFF97316),
                        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 15),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: const Icon(Icons.arrow_forward_rounded, color: Colors.white),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // Quick Sector Chips
                SizedBox(
                  height: 34,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: quickSectors.length,
                    itemBuilder: (context, index) {
                      final sector = quickSectors[index];
                      final isSelected = _selectedQuickSector == sector;

                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(sector),
                          selected: isSelected,
                          onSelected: (_) {
                            setState(() => _selectedQuickSector = sector);
                            if (sector == 'Toutes') {
                              _searchController.clear();
                              _triggerSearch('');
                            } else {
                              _searchController.text = sector;
                              _triggerSearch(sector);
                            }
                          },
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

          // 3-Part Practical Error Banner
          if (salesVm.errorMessage != null)
            Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.red.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.redAccent.withValues(alpha: 0.4)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline_rounded, color: Colors.redAccent, size: 26),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Erreur de recherche',
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
                            const SizedBox(height: 30),
                            Container(
                              padding: const EdgeInsets.all(20),
                              decoration: const BoxDecoration(
                                color: Color(0xFFF1F5F9),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.search_off_rounded, size: 54, color: Color(0xFF64748B)),
                            ),
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
                              'Veuillez vérifier l\'orthographe ou essayer l\'un des prospects ci-dessous :',
                              textAlign: TextAlign.center,
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
                                  avatar: const Icon(Icons.business_rounded, size: 16, color: Color(0xFFF97316)),
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
                            margin: const EdgeInsets.only(bottom: 14),
                            shape: RoundedRectangleBorder(
                              side: BorderSide(
                                color: isSelected ? const Color(0xFFF97316) : Colors.transparent,
                                width: isSelected ? 2 : 1,
                              ),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Row(
                                children: [
                                  // Avatar Initial
                                  Container(
                                    width: 48,
                                    height: 48,
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF0F172A),
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                    child: Center(
                                      child: Text(
                                        enterprise.name.isNotEmpty ? enterprise.name[0].toUpperCase() : 'E',
                                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 20),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 14),

                                  // Company Details
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Expanded(
                                              child: Text(
                                                enterprise.name,
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 16,
                                                ),
                                              ),
                                            ),
                                            if (enterprise.syncStatus == 'SYNCED') ...[
                                              const SizedBox(width: 6),
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                                decoration: BoxDecoration(
                                                  color: const Color(0xFF10B981).withValues(alpha: 0.12),
                                                  borderRadius: BorderRadius.circular(8),
                                                ),
                                                child: Row(
                                                  mainAxisSize: MainAxisSize.min,
                                                  children: const [
                                                    Icon(Icons.circle, color: Color(0xFF10B981), size: 6),
                                                    SizedBox(width: 4),
                                                    Text(
                                                      'Synchro CRM',
                                                      style: TextStyle(
                                                        color: Color(0xFF10B981),
                                                        fontSize: 10,
                                                        fontWeight: FontWeight.bold,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            ],
                                          ],
                                        ),
                                        const SizedBox(height: 6),
                                        Row(
                                          children: [
                                            const Icon(Icons.business_center_rounded, size: 14, color: Color(0xFF64748B)),
                                            const SizedBox(width: 4),
                                            Text(
                                              '${enterprise.sector} • ${enterprise.approximateSize}',
                                              style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 4),
                                        Row(
                                          children: [
                                            const Icon(Icons.location_on_rounded, size: 14, color: Color(0xFF64748B)),
                                            const SizedBox(width: 4),
                                            Text(
                                              enterprise.location ?? 'Non renseigné',
                                              style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 12),

                                  // Selection Button
                                  ElevatedButton(
                                    onPressed: () {
                                      salesVm.selectEnterprise(enterprise);
                                      Navigator.pushReplacement(
                                        context,
                                        MaterialPageRoute(builder: (_) => const VisitPreparationView()),
                                      );
                                    },
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: isSelected ? const Color(0xFF10B981) : const Color(0xFFF97316),
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                    ),
                                    child: Text(
                                      isSelected ? 'Sélectionné' : 'Choisir',
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                    ),
                                  ),
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
