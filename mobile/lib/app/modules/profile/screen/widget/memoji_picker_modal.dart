import 'dart:ui';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../../common/constants/app_constants.dart';
import '../../../../common/screen/widget/scale_tap.dart';
import '../../controller/profile_controller.dart';
import '../../model/memoji_model.dart';

/// Modal de Sélection de Memojis Apple-Grade
class MemojiPickerModal extends StatefulWidget {
  final bool isDark;

  const MemojiPickerModal({super.key, required this.isDark});

  static Future<void> show(BuildContext context, {required bool isDark}) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => MemojiPickerModal(isDark: isDark),
    );
  }

  @override
  State<MemojiPickerModal> createState() => _MemojiPickerModalState();
}

class _MemojiPickerModalState extends State<MemojiPickerModal> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _selectedEthnicity = 'tous';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) setState(() {});
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  List<MemojiItem> _filterItems(List<MemojiItem> list) {
    if (_selectedEthnicity == 'tous') return list;
    return list.where((m) => m.ethnicity == _selectedEthnicity).toList();
  }

  @override
  Widget build(BuildContext context) {
    final controller = Get.find<ProfileController>();
    final isDark = widget.isDark;
    final screenHeight = MediaQuery.of(context).size.height;

    final menItems = _filterItems(MemojiData.men);
    final womenItems = _filterItems(MemojiData.women);

    return ClipRRect(
      borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
        child: Container(
          height: screenHeight * 0.78,
          decoration: BoxDecoration(
            color: isDark ? const Color(0xF018181C) : const Color(0xF5FFFFFF),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Column(
            children: [
              // 1. Barre de préhension (Handle bar)
              Container(
                margin: const EdgeInsets.only(top: 10, bottom: 8),
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark ? Colors.white24 : Colors.black26,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),

              // 2. En-tête : Titre & Bouton Fermer (X)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Choisir un Memoji',
                          style: AppConstants.headlineStyle(isDark).copyWith(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Sélectionnez votre avatar de profil',
                          style: AppConstants.subheadStyle(isDark).copyWith(fontSize: 12),
                        ),
                      ],
                    ),
                    ScaleTap(
                      onTap: () => Navigator.of(context).pop(),
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0x33FFFFFF) : const Color(0x1A000000),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          LucideIcons.x,
                          size: 16,
                          color: isDark ? Colors.white : AppConstants.textDark,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),

              // 3. Sélecteur Hommes / Femmes (Segmented Tab Bar)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Container(
                  height: 42,
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF222228) : const Color(0xFFE5E5EA),
                    borderRadius: BorderRadius.circular(22),
                  ),
                  child: TabBar(
                    controller: _tabController,
                    indicatorSize: TabBarIndicatorSize.tab,
                    dividerColor: Colors.transparent,
                    indicator: BoxDecoration(
                      color: isDark ? const Color(0xFF323238) : Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.08),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    labelColor: isDark ? Colors.white : Colors.black,
                    unselectedLabelColor: const Color(0xFF8E8E93),
                    labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                    unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13),
                    tabs: [
                      Tab(text: 'Hommes (${MemojiData.men.length})'),
                      Tab(text: 'Femmes (${MemojiData.women.length})'),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // 4. Filtres Rapides par Origine (Pills horizontales)
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: [
                    _buildEthnicityPill('tous', 'Tous', isDark),
                    _buildEthnicityPill('blanc', 'Blanc', isDark),
                    _buildEthnicityPill('noir', 'Noir', isDark),
                    _buildEthnicityPill('arabe', 'Arabe', isDark),
                    _buildEthnicityPill('asiatique', 'Asiatique', isDark),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // 5. Grilles de Memojis Circulaires
              Expanded(
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    _buildMemojiGrid(menItems, controller, isDark),
                    _buildMemojiGrid(womenItems, controller, isDark),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEthnicityPill(String key, String label, bool isDark) {
    final isSelected = _selectedEthnicity == key;

    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ScaleTap(
        onTap: () => setState(() => _selectedEthnicity = key),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: isSelected
                ? (isDark ? Colors.white : AppConstants.primaryBlack)
                : (isDark ? const Color(0xFF222228) : const Color(0xFFF1F5F9)),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
              color: isSelected
                  ? (isDark ? Colors.black : Colors.white)
                  : (isDark ? const Color(0xFFD1D1D6) : const Color(0xFF636366)),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMemojiGrid(List<MemojiItem> items, ProfileController controller, bool isDark) {
    if (items.isEmpty) {
      return Center(
        child: Text(
          'Aucun avatar disponible pour ce filtre.',
          style: AppConstants.subheadStyle(isDark),
        ),
      );
    }

    return Obx(() {
      final currentSelected = controller.currentAvatar.value;

      return GridView.builder(
        padding: const EdgeInsets.fromLTRB(20, 6, 20, 30),
        physics: const BouncingScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 4,
          crossAxisSpacing: 16,
          mainAxisSpacing: 16,
          childAspectRatio: 1.0,
        ),
        itemCount: items.length,
        itemBuilder: (context, index) {
          final item = items[index];
          final isSelected = currentSelected == item.assetPath;

          return ScaleTap(
            onTap: () {
              controller.selectAvatar(item.assetPath);
              Navigator.of(context).pop();
              Get.snackbar(
                'Avatar mis à jour',
                'Votre photo de profil a été modifiée avec succès.',
                snackPosition: SnackPosition.TOP,
                duration: const Duration(seconds: 2),
                margin: const EdgeInsets.all(12),
                backgroundColor: isDark ? const Color(0xFF2C2C2E) : AppConstants.primaryBlack,
                colorText: Colors.white,
                icon: const Icon(LucideIcons.check, color: Color(0xFF10B981)),
              );
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: isSelected
                    ? Border.all(color: isDark ? Colors.white : AppConstants.primaryBlack, width: 3.0)
                    : Border.all(color: Colors.transparent, width: 3.0),
                boxShadow: isSelected
                    ? [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: isDark ? 0.4 : 0.15),
                          blurRadius: 10,
                          offset: const Offset(0, 3),
                        ),
                      ]
                    : null,
              ),
              padding: const EdgeInsets.all(2),
              child: ClipOval(
                child: Image.asset(
                  item.assetPath,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const Icon(
                    CupertinoIcons.person_crop_circle_fill,
                    color: Color(0xFF8E8E93),
                  ),
                ),
              ),
            ),
          );
        },
      );
    });
  }
}
