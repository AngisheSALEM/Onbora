import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controller/catalog_controller.dart';
import 'widget/catalog_item_card.dart';
import '../../../common/constants/app_constants.dart';
import '../../../common/screen/widget/skeleton_loader.dart';
import '../../../common/screen/widget/aurora_background.dart';
import '../../../common/screen/widget/glass_card.dart';

/// Screen 3: Solutions Catalog Screen (Orange B2B)
class CatalogScreen extends StatefulWidget {
  const CatalogScreen({super.key});

  @override
  State<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends State<CatalogScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final catalogController = Get.find<CatalogController>();
    final categories = ["Toutes", "Télécom", "Cybersécurité", "Cloud", "Santé"];

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(
          AppConstants.catalogTitle,
          style: TextStyle(
            color: isDark ? Colors.white : AppConstants.textDark,
            fontWeight: FontWeight.w900,
            fontSize: 18,
            letterSpacing: -0.3,
          ),
        ),
      ),
      body: AuroraBackground(
        child: SafeArea(
          child: Column(
            children: [
              // Search & Filter Header (Apple Glassmorphism)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppConstants.paddingLg, vertical: 8),
                child: GlassCard(
                  padding: const EdgeInsets.all(14),
                  borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleCard),
                  child: Column(
                    children: [
                      Container(
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF1E1E22) : Colors.white,
                          borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleButton),
                          border: Border.all(
                            color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
                          ),
                        ),
                        child: TextField(
                          controller: _searchController,
                          onChanged: (val) => catalogController.searchCatalog(val),
                          style: TextStyle(color: isDark ? Colors.white : AppConstants.textDark, fontWeight: FontWeight.w600),
                          decoration: InputDecoration(
                            hintText: AppConstants.catalogSearchHint,
                            hintStyle: TextStyle(
                              color: isDark ? AppConstants.textSecondaryDark : AppConstants.textMuted,
                              fontSize: 13,
                            ),
                            border: InputBorder.none,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            prefixIcon: Icon(Icons.search_rounded, color: isDark ? Colors.white70 : AppConstants.textDark),
                            suffixIcon: _searchController.text.isNotEmpty
                                ? IconButton(
                                    icon: const Icon(Icons.clear_rounded, color: Colors.grey),
                                    onPressed: () {
                                      _searchController.clear();
                                      catalogController.searchCatalog('');
                                    },
                                  )
                                : null,
                          ),
                        ),
                      ),
                      const SizedBox(height: AppConstants.marginMd),
                      SizedBox(
                        height: 32,
                        child: ListView.builder(
                          scrollDirection: Axis.horizontal,
                          physics: const ClampingScrollPhysics(),
                          itemCount: categories.length,
                          itemBuilder: (context, index) {
                            final category = categories[index];
                            return Obx(() {
                              final isSelected = catalogController.selectedCategory == category;
                              return Padding(
                                padding: const EdgeInsets.only(right: 6),
                                child: ChoiceChip(
                                  label: Text(category),
                                  selected: isSelected,
                                  onSelected: (_) => catalogController.filterByCategory(category),
                                  selectedColor: isDark ? Colors.white : const Color(0xFF18181B),
                                  labelStyle: TextStyle(
                                    color: isSelected
                                        ? (isDark ? const Color(0xFF121214) : Colors.white)
                                        : (isDark ? Colors.white : AppConstants.textDark),
                                    fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                                    fontSize: 11,
                                  ),
                                  backgroundColor: isDark ? const Color(0xFF1E1E22) : Colors.white,
                                  side: BorderSide(
                                    color: isSelected
                                        ? (isDark ? Colors.white : const Color(0xFF18181B))
                                        : (isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight),
                                  ),
                                ),
                              );
                            });
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Catalog List Items
              Expanded(
                child: Obx(() {
                  if (catalogController.isLoading.value) {
                    return const SkeletonListLoader(count: 4);
                  }

                  if (catalogController.filteredItems.isEmpty) {
                    return Center(
                      child: SingleChildScrollView(
                        physics: const ClampingScrollPhysics(),
                        padding: const EdgeInsets.all(AppConstants.paddingXl),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: isDark ? const Color(0xFF1E1E22) : const Color(0xFFF1F5F9),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.inventory_2_outlined, size: 48, color: AppConstants.textMuted),
                            ),
                            const SizedBox(height: 14),
                            Text(
                              'Aucune offre Orange B2B trouvée',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: isDark ? Colors.white : AppConstants.textDark,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Modifiez votre recherche ou changez de catégorie.',
                              style: TextStyle(
                                color: isDark ? AppConstants.textSecondaryDark : AppConstants.textMuted,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }

                  return ListView.builder(
                    physics: const ClampingScrollPhysics(),
                    padding: const EdgeInsets.symmetric(horizontal: AppConstants.paddingLg, vertical: 8),
                    itemCount: catalogController.filteredItems.length,
                    itemBuilder: (context, index) {
                      final item = catalogController.filteredItems[index];
                      return CatalogItemCard(item: item);
                    },
                  );
                }),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
