import 'dart:async';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controller/sales_controller.dart';
import 'widget/ai_brief_modal.dart';
import 'widget/credit_risk_badge.dart';
import '../../../common/constants/app_constants.dart';
import '../../../common/screen/widget/skeleton_loader.dart';
import '../../../common/screen/widget/scale_tap.dart';
import '../../../common/screen/widget/apple_large_title_sliver_app_bar.dart';

/// Screen: Recherche Prospects (Apple Design System)
class EnterpriseSearchScreen extends StatefulWidget {
  const EnterpriseSearchScreen({super.key});

  @override
  State<EnterpriseSearchScreen> createState() => _EnterpriseSearchScreenState();
}

class _EnterpriseSearchScreenState extends State<EnterpriseSearchScreen> {
  final _searchController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();
  Timer? _debounceTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final ctrl = Get.find<SalesController>();
      if (ctrl.searchResults.isEmpty) {
        ctrl.searchEnterprises('');
      }
      _searchFocusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  void _onSearchChanged(String query) {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 200), () {
      if (!mounted) return;
      Get.find<SalesController>().searchEnterprises(query.trim());
      setState(() {});
    });
  }

  void _handleBack() {
    _searchFocusNode.unfocus();
    Get.back();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final salesController = Get.find<SalesController>();

    return PopScope(
      canPop: true,
      onPopInvokedWithResult: (didPop, _) {
        _searchFocusNode.unfocus();
      },
      child: Scaffold(
        backgroundColor: isDark ? AppConstants.backgroundDark : AppConstants.backgroundLight,
        body: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(
            parent: BouncingScrollPhysics(),
          ),
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          slivers: [
            // 1. Collapsible Large Title (Apple Music Scroll Animation)
            AppleLargeTitleSliverAppBar(
              title: 'Recherche',
              leading: ScaleTap(
                onTap: _handleBack,
                child: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF2C2C2E) : const Color(0xFFE5E5EA),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    CupertinoIcons.chevron_back,
                    color: isDark ? Colors.white : AppConstants.textDark,
                    size: 20,
                  ),
                ),
              ),
            ),

            // 2. Barre de Recherche Supérieure Épurée (iOS 10px radius)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(AppConstants.paddingLg, 8, AppConstants.paddingLg, 12),
                child: Container(
                  height: 42,
                  decoration: BoxDecoration(
                    color: isDark ? AppConstants.cardDark : AppConstants.cardLight,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
                      width: 1,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: TextField(
                    controller: _searchController,
                    focusNode: _searchFocusNode,
                    onChanged: _onSearchChanged,
                    style: TextStyle(
                      color: isDark ? Colors.white : AppConstants.textDark,
                      fontWeight: FontWeight.w500,
                      fontSize: 15,
                    ),
                    textAlignVertical: TextAlignVertical.center,
                    decoration: InputDecoration(
                      isDense: true,
                      hintText: 'Rechercher un prospect...',
                      hintStyle: const TextStyle(
                        color: Color(0xFF8E8E93),
                        fontSize: 15,
                        fontWeight: FontWeight.w400,
                      ),
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 0),
                      prefixIconConstraints: const BoxConstraints(minWidth: 38, minHeight: 38),
                      prefixIcon: const Icon(
                        CupertinoIcons.search,
                        color: Color(0xFF8E8E93),
                        size: 18,
                      ),
                      suffixIconConstraints: const BoxConstraints(minWidth: 38, minHeight: 38),
                      suffixIcon: _searchController.text.isNotEmpty
                          ? IconButton(
                              padding: EdgeInsets.zero,
                              icon: const Icon(CupertinoIcons.xmark_circle_fill, color: Color(0xFF8E8E93), size: 16),
                              onPressed: () {
                                _searchController.clear();
                                salesController.searchEnterprises('');
                                setState(() {});
                              },
                            )
                          : null,
                    ),
                  ),
                ),
              ),
            ),

            // 3. Liste des Résultats Plein Écran
            Obx(() {
              if (salesController.isSearching.value) {
                return const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.symmetric(horizontal: AppConstants.paddingLg),
                    child: SkeletonListLoader(count: 5),
                  ),
                );
              }

              final results = salesController.searchResults;

              if (results.isEmpty) {
                return SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 48),
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(CupertinoIcons.search, size: 36, color: Color(0xFF8E8E93)),
                          const SizedBox(height: 12),
                          Text(
                            'Aucun prospect trouvé',
                            style: AppConstants.headlineStyle(isDark),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Essayez un autre nom d\'entreprise ou un secteur.',
                            style: AppConstants.subheadStyle(isDark),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }

              return SliverPadding(
                padding: const EdgeInsets.fromLTRB(
                  AppConstants.paddingLg,
                  0,
                  AppConstants.paddingLg,
                  40,
                ),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final enterprise = results[index];

                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        decoration: BoxDecoration(
                          color: isDark ? AppConstants.cardDark : AppConstants.cardLight,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isDark ? AppConstants.cardDarkBorder : AppConstants.borderLight,
                            width: 1,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                              blurRadius: 8,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(16),
                          onTap: () {
                            _searchFocusNode.unfocus();
                            salesController.selectEnterprise(enterprise);
                            AiBriefModal.show(context, enterprise);
                          },
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                // Nom du prospect + Secteur / Localisation
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        enterprise.name,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w700,
                                          color: isDark ? Colors.white : AppConstants.textDark,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        '${enterprise.sector ?? 'Entreprise'} • ${enterprise.location ?? 'Kinshasa'}',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF6B7280),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),

                                // Badge de Solvabilité
                                CreditRiskBadge(rating: enterprise.creditRating, compact: true),
                                const SizedBox(width: 6),

                                // Statut Converti / À convertir
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: enterprise.isConverted
                                        ? AppConstants.successGreen.withValues(alpha: 0.15)
                                        : AppConstants.accentYellow.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(AppConstants.borderRadiusPill),
                                  ),
                                  child: Text(
                                    enterprise.isConverted ? 'OK' : 'À convertir',
                                    style: TextStyle(
                                      color: enterprise.isConverted ? AppConstants.successGreen : const Color(0xFFD97706),
                                      fontWeight: FontWeight.w800,
                                      fontSize: 10,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                    childCount: results.length,
                  ),
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}
