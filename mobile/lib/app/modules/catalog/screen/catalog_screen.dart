import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controller/catalog_controller.dart';
import 'widget/catalog_item_card.dart';
import 'widget/roi_simulator_modal.dart';
import '../../../common/constants/app_constants.dart';
import '../../../common/screen/widget/skeleton_loader.dart';
import '../../../common/screen/widget/scale_tap.dart';
import '../../../common/screen/widget/apple_large_title_sliver_app_bar.dart';

class _CategoryMeta {
  final String key;
  final String label;
  final IconData icon;

  const _CategoryMeta({required this.key, required this.label, required this.icon});
}

/// Screen: Catalogue Solutions
/// - Grand Titre iOS (34px Bold) : « Catalogue »
/// - Filtre par icônes épurées (Fibre, Cybersécurité, Cloud, Santé)
/// - Simulateur ROI Express en 3 curseurs
class CatalogScreen extends StatefulWidget {
  const CatalogScreen({super.key});

  @override
  State<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends State<CatalogScreen> {
  final _searchController = TextEditingController();

  static const List<_CategoryMeta> _categories = [
    _CategoryMeta(key: 'Toutes', label: 'Toutes les offres', icon: CupertinoIcons.sparkles),
    _CategoryMeta(key: 'Télécom', label: 'Télécom & Connectivité', icon: CupertinoIcons.wifi),
    _CategoryMeta(key: 'Cybersécurité', label: 'Cybersécurité & Réseau', icon: CupertinoIcons.shield_fill),
    _CategoryMeta(key: 'Cloud', label: 'Cloud & Microsoft 365', icon: CupertinoIcons.cloud_fill),
    _CategoryMeta(key: 'Santé', label: 'Santé & Hébergement HDS', icon: CupertinoIcons.heart_fill),
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showFilterBottomSheet(BuildContext context, CatalogController controller, bool isDark) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1C1C1E) : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.25),
                blurRadius: 20,
                offset: const Offset(0, -4),
              ),
            ],
          ),
          child: SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(top: 12, bottom: 8),
                  decoration: BoxDecoration(
                    color: isDark ? Colors.white24 : Colors.black12,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Filtrer par catégorie',
                        style: AppConstants.title2Style(isDark).copyWith(fontSize: 16),
                      ),
                      TextButton(
                        onPressed: () {
                          controller.filterByCategory('Toutes');
                          Navigator.pop(ctx);
                        },
                        child: Text(
                          'Réinitialiser',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: isDark ? Colors.white : AppConstants.textDark,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Divider(
                  height: 1,
                  color: isDark ? AppConstants.dividerDark : AppConstants.dividerLight,
                ),
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    children: _categories.map((cat) {
                      final isSelected = controller.selectedCategory == cat.key;
                      return ScaleTap(
                        onTap: () {
                          controller.filterByCategory(cat.key);
                          Navigator.pop(ctx);
                        },
                        child: Container(
                          margin: const EdgeInsets.symmetric(vertical: 4),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? (isDark ? Colors.white : AppConstants.primaryBlack)
                                : (isDark ? const Color(0xFF141416) : const Color(0xFFF2F2F7)),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isSelected
                                  ? Colors.transparent
                                  : (isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight),
                              width: 1,
                            ),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                cat.icon,
                                size: 18,
                                color: isSelected
                                    ? (isDark ? Colors.black : Colors.white)
                                    : const Color(0xFF8E8E93),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  cat.label,
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                    color: isSelected
                                        ? (isDark ? Colors.black : Colors.white)
                                        : (isDark ? Colors.white : AppConstants.textDark),
                                  ),
                                ),
                              ),
                              if (isSelected)
                                Icon(
                                  CupertinoIcons.checkmark,
                                  color: isDark ? Colors.black : Colors.white,
                                  size: 16,
                                ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final catalogController = Get.find<CatalogController>();

    return Scaffold(
      backgroundColor: isDark ? AppConstants.backgroundDark : AppConstants.backgroundLight,
      body: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(
          parent: BouncingScrollPhysics(),
        ),
        slivers: [
          // 1. Collapsible Large Title (Apple Music Scroll Animation)
          AppleLargeTitleSliverAppBar(
            title: AppConstants.catalogTitle,
            actions: [
              GestureDetector(
                onTap: () => RoiSimulatorModal.show(context),
                child: Container(
                  margin: const EdgeInsets.only(right: 16),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFE5E5EA),
                    borderRadius: BorderRadius.circular(AppConstants.borderRadiusPill),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        CupertinoIcons.chart_bar_alt_fill,
                        size: 14,
                        color: isDark ? Colors.white : AppConstants.textDark,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'Simulateur ROI',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: isDark ? Colors.white : AppConstants.textDark,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

            // 2. Search, Filter and Solutions Content
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(
                AppConstants.paddingLg,
                8,
                AppConstants.paddingLg,
                100,
              ),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  // Search Bar + Filter Clean Icon
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          height: 38,
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF1C1C1E) : const Color(0xFFE5E5EA),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: TextField(
                            controller: _searchController,
                            onChanged: (val) {
                              catalogController.searchCatalog(val);
                              setState(() {});
                            },
                            style: TextStyle(
                              color: isDark ? Colors.white : AppConstants.textDark,
                              fontWeight: FontWeight.w400,
                              fontSize: 15,
                            ),
                            textAlignVertical: TextAlignVertical.center,
                            decoration: InputDecoration(
                              isDense: true,
                              hintText: 'Rechercher une offre...',
                              hintStyle: const TextStyle(
                                color: Color(0xFF8E8E93),
                                fontSize: 15,
                                fontWeight: FontWeight.w400,
                              ),
                              border: InputBorder.none,
                              enabledBorder: InputBorder.none,
                              focusedBorder: InputBorder.none,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 0),
                              prefixIconConstraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                              prefixIcon: const Icon(
                                CupertinoIcons.search,
                                color: Color(0xFF8E8E93),
                                size: 17,
                              ),
                              suffixIconConstraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                              suffixIcon: _searchController.text.isNotEmpty
                                  ? IconButton(
                                      padding: EdgeInsets.zero,
                                      icon: const Icon(CupertinoIcons.xmark_circle_fill, color: Color(0xFF8E8E93), size: 15),
                                      onPressed: () {
                                        _searchController.clear();
                                        catalogController.searchCatalog('');
                                        setState(() {});
                                      },
                                    )
                                  : null,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),

                      // Filter Clean Icon Trigger (Matching 10px Radius & 38px height)
                      Obx(() {
                        final currentCategory = catalogController.selectedCategory;
                        final isFiltered = currentCategory != 'Toutes';
                        final selectedMeta = _categories.firstWhereOrNull((c) => c.key == currentCategory);

                        return ScaleTap(
                          onTap: () => _showFilterBottomSheet(context, catalogController, isDark),
                          child: Container(
                            height: 38,
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            decoration: BoxDecoration(
                              color: isFiltered
                                  ? (isDark ? const Color(0xFF2C2C2E) : const Color(0xFFD1D1D6))
                                  : (isDark ? const Color(0xFF1C1C1E) : const Color(0xFFE5E5EA)),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  selectedMeta?.icon ?? CupertinoIcons.slider_horizontal_3,
                                  size: 17,
                                  color: isDark ? Colors.white : AppConstants.textDark,
                                ),
                                if (isFiltered) ...[
                                  const SizedBox(width: 6),
                                  Text(
                                    currentCategory,
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: isDark ? Colors.white : AppConstants.textDark,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        );
                      }),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Solutions Items List / Empty State
                  Obx(() {
                    if (catalogController.isLoading.value) {
                      return const SkeletonListLoader(count: 4);
                    }

                    final items = catalogController.filteredItems;
                    if (items.isEmpty) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 48),
                        child: Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(
                                CupertinoIcons.cube_box,
                                size: 40,
                                color: Color(0xFF8E8E93),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                'Aucune offre trouvée',
                                style: AppConstants.headlineStyle(isDark),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Essayez un autre mot-clé ou réinitialisez le filtre.',
                                style: AppConstants.subheadStyle(isDark),
                              ),
                            ],
                          ),
                        ),
                      );
                    }

                    return Column(
                      children: items.map((item) => CatalogItemCard(item: item)).toList(),
                    );
                  }),
                ]),
              ),
            ),
          ],
        ),
    );
  }
}
