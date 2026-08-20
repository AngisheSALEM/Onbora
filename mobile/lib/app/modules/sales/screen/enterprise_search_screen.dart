import 'dart:async';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../controller/sales_controller.dart';
import 'widget/ai_brief_modal.dart';
import '../../../common/constants/app_constants.dart';
import '../../../common/screen/widget/skeleton_loader.dart';
import '../../../common/screen/widget/aurora_background.dart';
import '../../../common/screen/widget/glass_card.dart';

/// Page Recherche Prospects Ultra-Épurée :
/// Uniquement la barre de recherche et les prospects avec Nom + Badge Vert (OK Converti) ou Jaune (À convertir).
class EnterpriseSearchScreen extends StatefulWidget {
  const EnterpriseSearchScreen({super.key});

  @override
  State<EnterpriseSearchScreen> createState() => _EnterpriseSearchScreenState();
}

class _EnterpriseSearchScreenState extends State<EnterpriseSearchScreen> {
  final _searchController = TextEditingController();
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
    });
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String query) {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 250), () {
      if (!mounted) return;
      Get.find<SalesController>().searchEnterprises(query.trim());
    });
  }

  void _handleBack() {
    FocusManager.instance.primaryFocus?.unfocus();
    Get.back();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final salesController = Get.find<SalesController>();

    return PopScope(
      canPop: true,
      onPopInvokedWithResult: (didPop, _) {
        FocusManager.instance.primaryFocus?.unfocus();
      },
      child: Scaffold(
        resizeToAvoidBottomInset: false,
        extendBodyBehindAppBar: true,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          leading: IconButton(
            icon: Icon(LucideIcons.arrowLeft, color: isDark ? Colors.white : AppConstants.textDark, size: 20),
            tooltip: 'Retour',
            onPressed: _handleBack,
          ),
          title: Text(
            'Recherche Prospects',
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
                // 1. Barre de Recherche Header
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: AppConstants.paddingLg, vertical: 8),
                  child: Container(
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E1E22) : Colors.white,
                      borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleButton),
                    ),
                    child: TextField(
                      controller: _searchController,
                      onChanged: _onSearchChanged,
                      style: TextStyle(
                        color: isDark ? Colors.white : AppConstants.textDark,
                        fontWeight: FontWeight.w600,
                      ),
                      decoration: InputDecoration(
                        hintText: 'Rechercher un prospect...',
                        hintStyle: TextStyle(
                          color: isDark ? AppConstants.textSecondaryDark : AppConstants.textMuted,
                          fontSize: 13,
                        ),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        prefixIcon: Icon(
                          LucideIcons.search,
                          color: isDark ? Colors.white70 : AppConstants.textDark,
                          size: 18,
                        ),
                        suffixIcon: _searchController.text.isNotEmpty
                            ? IconButton(
                                icon: const Icon(LucideIcons.x, color: Colors.grey, size: 18),
                                onPressed: () {
                                  _searchController.clear();
                                  salesController.searchEnterprises('');
                                },
                              )
                            : null,
                      ),
                    ),
                  ),
                ),

                // 2. Liste Épurée des Prospects (Nom + Statut Vert OK / Jaune)
                Expanded(
                  child: Obx(() {
                    if (salesController.isSearching.value) {
                      return const SkeletonListLoader(count: 5);
                    }

                    final results = salesController.searchResults;

                    if (results.isEmpty) {
                      return Center(
                        child: Text(
                          'Aucun prospect trouvé',
                          style: TextStyle(
                            color: isDark ? AppConstants.textSecondaryDark : AppConstants.textMuted,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      );
                    }

                    return ListView.builder(
                      physics: const ClampingScrollPhysics(),
                      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                      padding: const EdgeInsets.symmetric(horizontal: AppConstants.paddingLg, vertical: 6),
                      itemCount: results.length,
                      itemBuilder: (context, index) {
                        final enterprise = results[index];

                        return RepaintBoundary(
                          child: GlassCard(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                            borderRadius: BorderRadius.circular(AppConstants.borderRadiusAppleButton),
                            onTap: () {
                              salesController.selectEnterprise(enterprise);
                              AiBriefModal.show(context, enterprise);
                            },
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                // Nom du prospect
                                Expanded(
                                  child: Text(
                                    enterprise.name,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w800,
                                      color: isDark ? Colors.white : AppConstants.textDark,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),

                                // Badge Vert OK (Converti) ou Jaune (À convertir)
                                if (enterprise.isConverted)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: AppConstants.successGreen.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(AppConstants.borderRadiusPill),
                                      border: Border.all(color: AppConstants.successGreen, width: 1.0),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: const [
                                        Icon(LucideIcons.checkCircle2, color: AppConstants.successGreen, size: 13),
                                        SizedBox(width: 4),
                                        Text(
                                          'OK',
                                          style: TextStyle(
                                            color: AppConstants.successGreen,
                                            fontSize: 11,
                                            fontWeight: FontWeight.w900,
                                          ),
                                        ),
                                      ],
                                    ),
                                  )
                                else
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: AppConstants.accentYellow.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(AppConstants.borderRadiusPill),
                                      border: Border.all(color: AppConstants.accentYellow, width: 1.0),
                                    ),
                                    child: const Text(
                                      'À convertir',
                                      style: TextStyle(
                                        color: Color(0xFFD97706),
                                        fontSize: 11,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        );
                      },
                    );
                  }),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
